"use server";

import { revalidatePath } from "next/cache";

import { requireManager } from "@/lib/auth-guards";
import { isUniqueConstraintViolation } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
import { getProjectRoleDeleteBlockReason } from "@/lib/project-role-master";
import {
  parseProjectRoleMasterForm,
  type ProjectRoleMasterFormState,
} from "@/lib/project-role-master-schema";

const PROGRAM = "MST003";
const PATH = "/master/project-roles";

export async function saveProjectRole(
  projectRoleId: number | null,
  _prevState: ProjectRoleMasterFormState,
  formData: FormData,
): Promise<ProjectRoleMasterFormState> {
  const user = await requireManager();

  const parsed = parseProjectRoleMasterForm(formData);
  if (!parsed.success) {
    return { error: parsed.error };
  }

  // project_role_nameはシステム全体でユニーク(deletedAtを問わないDB制約)なため、
  // 論理削除済みの同名行が残っていると新規createがユニーク制約違反になる。
  // その場合は新規作成ではなく、削除済み行を復活させる。
  const deletedRoleToReactivate = projectRoleId
    ? null
    : await prisma.projectRole.findFirst({
        where: { projectRoleName: parsed.projectRoleName, deletedAt: { not: null } },
        select: { id: true },
      });

  try {
    if (projectRoleId) {
      await prisma.projectRole.update({
        where: { id: projectRoleId },
        data: {
          projectRoleName: parsed.projectRoleName,
          updatedBy: user.employeeId,
          updatedProgram: PROGRAM,
        },
      });
    } else if (deletedRoleToReactivate) {
      await prisma.projectRole.update({
        where: { id: deletedRoleToReactivate.id },
        data: {
          projectRoleName: parsed.projectRoleName,
          deletedAt: null,
          deletedBy: null,
          deletedProgram: null,
          updatedBy: user.employeeId,
          updatedProgram: PROGRAM,
        },
      });
    } else {
      await prisma.projectRole.create({
        data: {
          projectRoleName: parsed.projectRoleName,
          createdBy: user.employeeId,
          createdProgram: PROGRAM,
          updatedBy: user.employeeId,
          updatedProgram: PROGRAM,
        },
      });
    }
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return { error: "既に登録されている役割名です。" };
    }
    return { error: "保存に失敗しました。時間をおいて再度お試しください。" };
  }

  revalidatePath(PATH);
  return { error: null };
}

export async function deleteProjectRole(
  projectRoleId: number,
): Promise<{ error: string | null }> {
  const user = await requireManager();

  const blockReason = await getProjectRoleDeleteBlockReason(projectRoleId);
  if (blockReason) {
    return { error: blockReason };
  }

  await prisma.projectRole.update({
    where: { id: projectRoleId },
    data: {
      deletedAt: new Date(),
      deletedBy: user.employeeId,
      deletedProgram: PROGRAM,
    },
  });

  revalidatePath(PATH);
  return { error: null };
}
