"use client";

import { useActionState, useState, useTransition } from "react";

import { deleteSite, saveSite } from "@/app/(authenticated)/master/sites/actions";
import { ClearableInput } from "@/components/ui/ClearableInput";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { SiteMasterFormState } from "@/lib/site-master-schema";

export type SiteMasterSite = {
  id: number;
  siteName: string;
  organizationUnitId: number | null;
};

// 主管部署の選択肢(部のみ。表示名は「事業部 / 部」)
export type SiteDepartmentOption = {
  id: number;
  name: string;
};

const initialState: SiteMasterFormState = { error: null };

export function SiteMasterRow({
  site,
  departments,
}: {
  site: SiteMasterSite;
  departments: SiteDepartmentOption[];
}) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();

  const saveAction = saveSite.bind(null, site.id);
  const [state, formAction, isPending] = useActionState(saveAction, initialState);
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (!state.error) setMode("view");
  }

  const departmentName =
    departments.find((d) => d.id === site.organizationUnitId)?.name ?? null;

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteSite(site.id);
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
      <form
        action={formAction}
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-surface-border p-3"
      >
        <span className="inline-flex w-64">
          <ClearableInput
            name="siteName"
            defaultValue={site.siteName}
            maxLength={100}
            className="h-8 px-3 py-1 text-sm"
          />
        </span>
        <select
          name="organizationUnitId"
          aria-label="主管部署"
          defaultValue={site.organizationUnitId ?? ""}
          className="h-8 rounded-full border border-surface-border px-3 py-1 text-sm"
        >
          <option value="">主管部署なし</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary-dark"
        >
          {isPending ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={() => setMode("view")}
          className="text-xs text-foreground/60"
        >
          キャンセル
        </button>
        {state.error ? (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-surface-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {site.siteName}
          {departmentName ? (
            <span className="ml-2 text-xs font-normal text-foreground/60">
              主管部署: {departmentName}
            </span>
          ) : null}
        </span>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className="rounded-full border border-primary px-2 py-1 text-brand hover:bg-primary/10"
          >
            編集
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="rounded-full border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50"
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
          message={`「${site.siteName}」を削除してもよろしいですか？`}
          isPending={isDeletePending}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      ) : null}
    </div>
  );
}
