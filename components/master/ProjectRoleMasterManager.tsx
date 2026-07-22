"use client";

import { saveProjectRole } from "@/app/(authenticated)/master/project-roles/actions";
import { InlineAddForm } from "@/components/master/InlineAddForm";
import {
  ProjectRoleMasterRow,
  type ProjectRoleMasterRole,
} from "@/components/master/ProjectRoleMasterRow";

const createProjectRoleAction = saveProjectRole.bind(null, null);

export function ProjectRoleMasterManager({ roles }: { roles: ProjectRoleMasterRole[] }) {
  const sortedRoles = roles
    .slice()
    .sort((a, b) => a.projectRoleName.localeCompare(b.projectRoleName, "ja"));

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      {/* 役割の追加フィールドは最上部に常時表示(コンパクトな1行形) */}
      <InlineAddForm
        action={createProjectRoleAction}
        name="projectRoleName"
        placeholder="役割名"
        submitLabel="役割を追加"
        maxLength={20}
      />

      <div className="flex flex-col gap-2">
        {sortedRoles.length === 0 ? (
          <p className="text-sm text-foreground/60">登録済みの役割はありません。</p>
        ) : (
          sortedRoles.map((role) => <ProjectRoleMasterRow key={role.id} role={role} />)
        )}
      </div>
    </div>
  );
}
