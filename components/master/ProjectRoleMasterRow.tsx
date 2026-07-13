"use client";

import { useActionState, useState, useTransition } from "react";

import {
  deleteProjectRole,
  saveProjectRole,
} from "@/app/(authenticated)/master/project-roles/actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { ProjectRoleMasterFormState } from "@/lib/project-role-master-schema";

export type ProjectRoleMasterRole = {
  id: number;
  projectRoleName: string;
};

const initialState: ProjectRoleMasterFormState = { error: null };

export function ProjectRoleMasterRow({ role }: { role: ProjectRoleMasterRole }) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();

  const saveAction = saveProjectRole.bind(null, role.id);
  const [state, formAction, isPending] = useActionState(saveAction, initialState);
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (!state.error) setMode("view");
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteProjectRole(role.id);
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
          name="projectRoleName"
          defaultValue={role.projectRoleName}
          maxLength={20}
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
        <span className="text-sm font-medium">{role.projectRoleName}</span>
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
          message={`「${role.projectRoleName}」を削除してもよろしいですか？`}
          isPending={isDeletePending}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      ) : null}
    </div>
  );
}
