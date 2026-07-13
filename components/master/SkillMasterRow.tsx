"use client";

import { useActionState, useState, useTransition } from "react";

import { deleteSkill, saveSkill } from "@/app/(authenticated)/master/skills/actions";
import { CategorySelectField, type CategoryOption } from "@/components/master/CategorySelectField";
import { VersionTagEditor } from "@/components/master/VersionTagEditor";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { SkillMasterFormState } from "@/lib/skill-master-schema";

export type SkillMasterSkill = {
  id: number;
  skillName: string;
  categoryId: number;
  versionNames: string[];
};

type SkillMasterRowProps = {
  skill: SkillMasterSkill;
  categories: CategoryOption[];
};

const initialState: SkillMasterFormState = { error: null };

export function SkillMasterRow({ skill, categories }: SkillMasterRowProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();

  const saveAction = saveSkill.bind(null, skill.id);
  const [state, formAction, isPending] = useActionState(saveAction, initialState);
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (!state.error) setMode("view");
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteSkill(skill.id);
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
        <CategorySelectField categories={categories} defaultCategoryId={skill.categoryId} />
        <input
          type="text"
          name="skillName"
          defaultValue={skill.skillName}
          maxLength={100}
          className="rounded border px-2 py-1 text-sm"
        />
        <VersionTagEditor name="versionNames" initialValues={skill.versionNames} />
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
          <span className="text-sm font-medium">{skill.skillName}</span>
          {skill.versionNames.length > 0 ? (
            <span className="ml-2 text-xs text-zinc-500">
              {skill.versionNames.join(", ")}
            </span>
          ) : null}
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
          message={`「${skill.skillName}」を削除してもよろしいですか？`}
          isPending={isDeletePending}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      ) : null}
    </div>
  );
}
