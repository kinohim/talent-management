"use client";

import { useActionState, useState } from "react";

import { saveProjectRole } from "@/app/(authenticated)/master/project-roles/actions";
import {
  ProjectRoleMasterRow,
  type ProjectRoleMasterRole,
} from "@/components/master/ProjectRoleMasterRow";
import type { ProjectRoleMasterFormState } from "@/lib/project-role-master-schema";

const initialState: ProjectRoleMasterFormState = { error: null };
const createProjectRoleAction = saveProjectRole.bind(null, null);

export function ProjectRoleMasterManager({ roles }: { roles: ProjectRoleMasterRole[] }) {
  const [state, formAction, isPending] = useActionState(
    createProjectRoleAction,
    initialState,
  );
  const [resetKey, setResetKey] = useState(0);
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (!state.error) setResetKey((key) => key + 1);
  }

  const sortedRoles = roles
    .slice()
    .sort((a, b) => a.projectRoleName.localeCompare(b.projectRoleName, "ja"));

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <form action={formAction} className="flex flex-col gap-3 rounded border p-4">
        <h2 className="text-sm font-semibold">役割を追加</h2>
        <input
          key={`project-role-name-${resetKey}`}
          type="text"
          name="projectRoleName"
          placeholder="役割名"
          maxLength={20}
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
          {isPending ? "追加中..." : "役割を追加"}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {sortedRoles.length === 0 ? (
          <p className="text-sm text-zinc-500">登録済みの役割はありません。</p>
        ) : (
          sortedRoles.map((role) => <ProjectRoleMasterRow key={role.id} role={role} />)
        )}
      </div>
    </div>
  );
}
