"use client";

import { useActionState, useState, useTransition } from "react";

import { deleteSite, saveSite } from "@/app/(authenticated)/master/sites/actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { SiteMasterFormState } from "@/lib/site-master-schema";

export type SiteMasterSite = {
  id: number;
  siteName: string;
};

const initialState: SiteMasterFormState = { error: null };

export function SiteMasterRow({ site }: { site: SiteMasterSite }) {
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
      <form action={formAction} className="flex items-center gap-2 rounded border p-3">
        <input
          type="text"
          name="siteName"
          defaultValue={site.siteName}
          maxLength={100}
          className="rounded border px-2 py-1 text-sm"
        />
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
        {state.error ? (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{site.siteName}</span>
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
          message={`「${site.siteName}」を削除してもよろしいですか？`}
          isPending={isDeletePending}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      ) : null}
    </div>
  );
}
