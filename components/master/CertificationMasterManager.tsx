"use client";

import { useActionState, useState } from "react";

import {
  createCertificationCategory,
  saveCertification,
} from "@/app/(authenticated)/master/certifications/actions";
import type { CategoryOption } from "@/components/master/CategorySelectField";
import {
  CertificationMasterRow,
  type CertificationMasterCertification,
} from "@/components/master/CertificationMasterRow";
import { InlineAddForm } from "@/components/master/InlineAddForm";
import type { CertificationMasterFormState } from "@/lib/certification-master-schema";

type CertificationMasterManagerProps = {
  categories: CategoryOption[];
  certifications: (CertificationMasterCertification & { categoryName: string })[];
};

const initialState: CertificationMasterFormState = { error: null };
const createCertificationAction = saveCertification.bind(null, null);

// カテゴリ確定済みの資格追加フォーム(カテゴリ見出しの[+ 追加]から展開)。
// categoryIdはhiddenで送るため、既存のsaveCertification(existingカテゴリ
// モード)をそのまま利用できる。
function CategoryCertificationAddForm({
  categoryId,
  onClose,
}: {
  categoryId: number;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createCertificationAction,
    initialState,
  );
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (!state.error) onClose();
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded border border-dashed p-3">
      <input type="hidden" name="categoryId" value={categoryId} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="certificationName"
          placeholder="資格名"
          maxLength={100}
          autoFocus
          className="w-64 rounded border px-2 py-1 text-sm"
        />
        <input
          type="text"
          name="certificationOrganization"
          placeholder="認定団体"
          maxLength={100}
          className="w-48 rounded border px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded border px-3 py-1 text-xs"
        >
          {isPending ? "追加中..." : "追加"}
        </button>
        <button type="button" onClick={onClose} className="text-xs text-zinc-500">
          キャンセル
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function CertificationCategorySection({
  category,
  certifications,
  categories,
}: {
  category: CategoryOption;
  certifications: (CertificationMasterCertification & { categoryName: string })[];
  categories: CategoryOption[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const sortedCertifications = certifications
    .slice()
    .sort((a, b) => a.certificationName.localeCompare(b.certificationName, "ja"));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2">
        <div className="flex items-center gap-2">
          {sortedCertifications.length > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? "カテゴリを閉じる" : "カテゴリを開く"}
              className="w-5 text-center text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {expanded ? "▼" : "▶"}
            </button>
          ) : (
            <span aria-hidden="true" className="w-5" />
          )}
          <h3 className="text-sm font-semibold">
            {category.name}
            <span className="ml-2 text-xs font-normal text-zinc-400">
              {sortedCertifications.length}件
            </span>
          </h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(true);
            setExpanded(true);
          }}
          className="rounded border px-2 py-1 text-xs"
        >
          + 追加
        </button>
      </div>

      {showAddForm ? (
        <div className="pl-7">
          <CategoryCertificationAddForm
            categoryId={category.id}
            onClose={() => setShowAddForm(false)}
          />
        </div>
      ) : null}

      {expanded && sortedCertifications.length > 0 ? (
        <div className="flex flex-col gap-2 pl-7">
          {sortedCertifications.map((certification) => (
            <CertificationMasterRow
              key={certification.id}
              certification={certification}
              categories={categories}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CertificationMasterManager({
  categories,
  certifications,
}: CertificationMasterManagerProps) {
  const sortedCategories = categories
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {/* カテゴリの追加フィールドは最上部に常時表示。資格自体の追加は
          各カテゴリ見出しの[+ 追加]から行う */}
      <InlineAddForm
        action={createCertificationCategory}
        name="categoryName"
        placeholder="カテゴリ名"
        submitLabel="カテゴリを追加"
      />

      <div className="flex flex-col gap-3">
        {sortedCategories.length === 0 ? (
          <p className="text-sm text-zinc-500">登録済みのカテゴリはありません。</p>
        ) : (
          sortedCategories.map((category) => (
            <CertificationCategorySection
              key={category.id}
              category={category}
              certifications={certifications.filter(
                (certification) => certification.categoryId === category.id,
              )}
              categories={categories}
            />
          ))
        )}
      </div>
    </div>
  );
}
