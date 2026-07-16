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
  parseCategoryNameForm,
  parseSkillMasterForm,
  type SkillMasterFormState,
} from "@/lib/skill-master-schema";

const PROGRAM = "master-skills";
const PATH = "/master/skills";

// master-skillsの「カテゴリを追加」(カテゴリのみ新規作成)。スキルの追加は
// カテゴリ見出しごとのフォームからsaveSkillで行う。
export async function createSkillCategory(
  _prevState: SkillMasterFormState,
  formData: FormData,
): Promise<SkillMasterFormState> {
  const user = await requireManager();

  const parsed = parseCategoryNameForm(formData);
  if (!parsed.success) {
    return { error: parsed.error };
  }
  const categoryName = parsed.data;

  // 有効な同名カテゴリの重複を事前チェック(DB制約のP2002より分かりやすい
  // タイミングでエラーを返す)。
  const activeSameName = await prisma.skillCategory.findFirst({
    where: { skillCategoryName: categoryName, deletedAt: null },
    select: { id: true },
  });
  if (activeSameName) {
    return { error: "既に登録されているカテゴリ名です。" };
  }

  // カテゴリ名はユニーク(deletedAtを問わないDB制約)なため、論理削除済みの
  // 同名行が残っていれば新規作成ではなく復活させる(saveSkillと同じ流儀)。
  const deletedToReactivate = await prisma.skillCategory.findFirst({
    where: { skillCategoryName: categoryName, deletedAt: { not: null } },
    select: { id: true },
  });

  try {
    if (deletedToReactivate) {
      await prisma.skillCategory.update({
        where: { id: deletedToReactivate.id },
        data: {
          deletedAt: null,
          deletedBy: null,
          deletedProgram: null,
          updatedBy: user.employeeId,
          updatedProgram: PROGRAM,
        },
      });
    } else {
      await prisma.skillCategory.create({
        data: {
          skillCategoryName: categoryName,
          createdBy: user.employeeId,
          createdProgram: PROGRAM,
          updatedBy: user.employeeId,
          updatedProgram: PROGRAM,
        },
      });
    }
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return { error: "既に登録されているカテゴリ名です。" };
    }
    return { error: "保存に失敗しました。時間をおいて再度お試しください。" };
  }

  revalidatePath(PATH);
  return { error: null };
}

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
    // カテゴリ名は各マスタ内で一意。有効な同名があればエラー、
    // 論理削除済みの同名があれば復活して使う(createSkillCategoryと同じ流儀)。
    const sameName = await prisma.skillCategory.findFirst({
      where: { skillCategoryName: category.categoryName },
      select: { id: true, deletedAt: true },
    });
    if (sameName && sameName.deletedAt === null) {
      return { error: "既に登録されているカテゴリ名です。" };
    }
    if (sameName) {
      await prisma.skillCategory.update({
        where: { id: sameName.id },
        data: {
          deletedAt: null,
          deletedBy: null,
          deletedProgram: null,
          updatedBy: user.employeeId,
          updatedProgram: PROGRAM,
        },
      });
      categoryId = sameName.id;
    } else {
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
    }
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

  // skill_nameはシステム全体でユニーク(deletedAtを問わないDB制約)なため、
  // 論理削除済みの同名行が残っていると新規createがユニーク制約違反になる。
  // その場合は新規作成ではなく、削除済み行を復活させる。
  const deletedSkillToReactivate = skillId
    ? null
    : await prisma.skill.findFirst({
        where: { skillName, deletedAt: { not: null } },
        select: { id: true },
      });

  try {
    await prisma.$transaction(async (tx) => {
      const skillFields = {
        skillCategoryId: categoryId,
        skillName,
        hasVersion: versionNames.length > 0,
        updatedBy: user.employeeId,
        updatedProgram: PROGRAM,
      };

      const skill = skillId
        ? await tx.skill.update({ where: { id: skillId }, data: skillFields })
        : deletedSkillToReactivate
          ? await tx.skill.update({
              where: { id: deletedSkillToReactivate.id },
              data: { ...skillFields, deletedAt: null, deletedBy: null, deletedProgram: null },
            })
          : await tx.skill.create({
              data: {
                ...skillFields,
                createdBy: user.employeeId,
                createdProgram: PROGRAM,
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
