"use server";

import { revalidatePath } from "next/cache";

import { requireManager } from "@/lib/auth-guards";
import { isUniqueConstraintViolation } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
import {
  getSkillDeleteBlockReason,
  isSkillVersionReferenced,
  planSkillVersionDiff,
} from "@/lib/skill-master";
import {
  parseSkillMasterForm,
  type SkillMasterFormState,
} from "@/lib/skill-master-schema";

const PROGRAM = "MST001";
const PATH = "/master/skills";

export async function saveSkill(
  skillId: number | null,
  _prevState: SkillMasterFormState,
  formData: FormData,
): Promise<SkillMasterFormState> {
  const user = await requireManager();

  const parsed = parseSkillMasterForm(formData);
  if (!parsed.success) {
    return { error: parsed.error };
  }
  const { category, skillName, versionNames } = parsed.data;

  let categoryId: number;
  if (category.mode === "new") {
    const created = await prisma.skillCategory.create({
      data: {
        skillCategoryName: category.categoryName,
        createdBy: user.employeeId,
        createdProgram: PROGRAM,
        updatedBy: user.employeeId,
        updatedProgram: PROGRAM,
      },
    });
    categoryId = created.id;
  } else {
    const existing = await prisma.skillCategory.findFirst({
      where: { id: category.categoryId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      return { error: "カテゴリが見つかりません。" };
    }
    categoryId = existing.id;
  }

  const existingVersions = skillId
    ? await prisma.skillVersion.findMany({
        where: { skillId, deletedAt: null },
        select: { id: true, versionName: true, isActive: true },
      })
    : [];
  const versionPlan = planSkillVersionDiff(existingVersions, versionNames);

  // 削除候補(送信タグから外れたバージョン)は、参照有無をあらかじめ確認しておく
  // (物理削除するか非表示化するかをトランザクション実行前に決定する)。
  const removalDecisions = await Promise.all(
    versionPlan.toRemoveIds.map(async (id) => ({
      id,
      referenced: await isSkillVersionReferenced(id),
    })),
  );

  try {
    await prisma.$transaction(async (tx) => {
      const skill = skillId
        ? await tx.skill.update({
            where: { id: skillId },
            data: {
              skillCategoryId: categoryId,
              skillName,
              hasVersion: versionNames.length > 0,
              updatedBy: user.employeeId,
              updatedProgram: PROGRAM,
            },
          })
        : await tx.skill.create({
            data: {
              skillCategoryId: categoryId,
              skillName,
              hasVersion: versionNames.length > 0,
              createdBy: user.employeeId,
              createdProgram: PROGRAM,
              updatedBy: user.employeeId,
              updatedProgram: PROGRAM,
            },
          });

      if (versionPlan.toCreate.length > 0) {
        await tx.skillVersion.createMany({
          data: versionPlan.toCreate.map((versionName) => ({
            skillId: skill.id,
            versionName,
            displayName: `${skillName} ${versionName}`,
            isActive: true,
            createdBy: user.employeeId,
            createdProgram: PROGRAM,
            updatedBy: user.employeeId,
            updatedProgram: PROGRAM,
          })),
        });
      }

      if (versionPlan.toReactivateIds.length > 0) {
        await tx.skillVersion.updateMany({
          where: { id: { in: versionPlan.toReactivateIds } },
          data: {
            isActive: true,
            updatedBy: user.employeeId,
            updatedProgram: PROGRAM,
          },
        });
      }

      for (const { id, referenced } of removalDecisions) {
        if (referenced) {
          await tx.skillVersion.update({
            where: { id },
            data: {
              isActive: false,
              updatedBy: user.employeeId,
              updatedProgram: PROGRAM,
            },
          });
        } else {
          await tx.skillVersion.delete({ where: { id } });
        }
      }
    });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return { error: "既に登録されているスキル名です。" };
    }
    return { error: "保存に失敗しました。時間をおいて再度お試しください。" };
  }

  revalidatePath(PATH);
  return { error: null };
}

export async function deleteSkill(skillId: number): Promise<{ error: string | null }> {
  const user = await requireManager();

  const blockReason = await getSkillDeleteBlockReason(skillId);
  if (blockReason) {
    return { error: blockReason };
  }

  const deletedAt = new Date();
  const auditDelete = {
    deletedAt,
    deletedBy: user.employeeId,
    deletedProgram: PROGRAM,
  };

  await prisma.$transaction(async (tx) => {
    await tx.skill.update({ where: { id: skillId }, data: auditDelete });
    await tx.skillVersion.updateMany({
      where: { skillId, deletedAt: null },
      data: auditDelete,
    });
  });

  revalidatePath(PATH);
  return { error: null };
}
