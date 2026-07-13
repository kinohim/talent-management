"use client";

import { useActionState, useState, useTransition } from "react";

import {
  deleteCertification,
  saveCertification,
} from "@/app/(authenticated)/master/certifications/actions";
import { CategorySelectField, type CategoryOption } from "@/components/master/CategorySelectField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { CertificationMasterFormState } from "@/lib/certification-master-schema";

export type CertificationMasterCertification = {
  id: number;
  certificationName: string;
  certificationOrganization: string;
  categoryId: number;
};

type CertificationMasterRowProps = {
  certification: CertificationMasterCertification;
  categories: CategoryOption[];
};

const initialState: CertificationMasterFormState = { error: null };

export function CertificationMasterRow({
  certification,
  categories,
}: CertificationMasterRowProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();

  const saveAction = saveCertification.bind(null, certification.id);
  const [state, formAction, isPending] = useActionState(saveAction, initialState);
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (!state.error) setMode("view");
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteCertification(certification.id);
      if (result.error) {
        setDeleteError(result.error);
        setShowConfirm(false);
      } else {
        setDeleteError(null);
      }
    });
  }

  if (mode === "edit") {
    return (
      <form action={formAction} className="flex flex-col gap-2 rounded border p-3">
        <CategorySelectField categories={categories} defaultCategoryId={certification.categoryId} />
        <input
          type="text"
          name="certificationName"
          defaultValue={certification.certificationName}
          maxLength={100}
          placeholder="資格名"
          className="rounded border px-2 py-1 text-sm"
        />
        <input
          type="text"
          name="certificationOrganization"
          defaultValue={certification.certificationOrganization}
          maxLength={100}
          placeholder="認定団体"
          className="rounded border px-2 py-1 text-sm"
        />
        {state.error ? (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded border px-3 py-1 text-xs"
          >
            {isPending ? "保存中..." : "保存"}
          </button>
          <button
            type="button"
            onClick={() => setMode("view")}
            className="text-xs text-zinc-500"
          >
            キャンセル
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-sm font-medium">{certification.certificationName}</span>
          <span className="ml-2 text-xs text-zinc-500">
            {certification.certificationOrganization}
          </span>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className="rounded border px-2 py-1"
          >
            編集
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="rounded border px-2 py-1 text-red-600"
          >
            削除
          </button>
        </div>
      </div>
      {deleteError ? (
        <p role="alert" className="text-sm text-red-600">
          {deleteError}
        </p>
      ) : null}
      {showConfirm ? (
        <ConfirmDialog
          message={`「${certification.certificationName}」を削除してもよろしいですか？`}
          isPending={isDeletePending}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      ) : null}
    </div>
  );
}
