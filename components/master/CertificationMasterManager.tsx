"use client";

import { useActionState, useState } from "react";

import { saveCertification } from "@/app/(authenticated)/master/certifications/actions";
import { CategorySelectField, type CategoryOption } from "@/components/master/CategorySelectField";
import {
  CertificationMasterRow,
  type CertificationMasterCertification,
} from "@/components/master/CertificationMasterRow";
import type { CertificationMasterFormState } from "@/lib/certification-master-schema";

type CertificationMasterManagerProps = {
  categories: CategoryOption[];
  certifications: (CertificationMasterCertification & { categoryName: string })[];
};

const initialState: CertificationMasterFormState = { error: null };
const createCertificationAction = saveCertification.bind(null, null);

export function CertificationMasterManager({
  categories,
  certifications,
}: CertificationMasterManagerProps) {
  const [state, formAction, isPending] = useActionState(
    createCertificationAction,
    initialState,
  );
  const [resetKey, setResetKey] = useState(0);
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (!state.error) setResetKey((key) => key + 1);
  }

  const groupsByCategory = new Map<
    string,
    (CertificationMasterCertification & { categoryName: string })[]
  >();
  for (const certification of certifications) {
    const group = groupsByCategory.get(certification.categoryName) ?? [];
    group.push(certification);
    groupsByCategory.set(certification.categoryName, group);
  }
  const groups = [...groupsByCategory.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "ja"),
  );

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <form action={formAction} className="flex flex-col gap-3 rounded border p-4">
        <h2 className="text-sm font-semibold">資格を追加</h2>
        <CategorySelectField key={`category-${resetKey}`} categories={categories} />
        <input
          key={`certification-name-${resetKey}`}
          type="text"
          name="certificationName"
          placeholder="資格名"
          maxLength={100}
          className="rounded border px-2 py-1 text-sm"
        />
        <input
          key={`certification-organization-${resetKey}`}
          type="text"
          name="certificationOrganization"
          placeholder="認定団体"
          maxLength={100}
          className="rounded border px-2 py-1 text-sm"
        />
        {state.error ? (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {isPending ? "追加中..." : "資格を追加"}
        </button>
      </form>

      <div className="flex flex-col gap-6">
        {groups.length === 0 ? (
          <p className="text-sm text-zinc-500">登録済みの資格はありません。</p>
        ) : (
          groups.map(([categoryName, categoryCertifications]) => (
            <div key={categoryName} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">{categoryName}</h3>
              <div className="flex flex-col gap-2">
                {categoryCertifications
                  .slice()
                  .sort((a, b) =>
                    a.certificationName.localeCompare(b.certificationName, "ja"),
                  )
                  .map((certification) => (
                    <CertificationMasterRow
                      key={certification.id}
                      certification={certification}
                      categories={categories}
                    />
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
