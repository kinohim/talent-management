import { prisma } from "@/lib/prisma";
import type { SkillRowInput } from "@/lib/skill-schema";

export type SkillCategoryOption = {
  id: number;
  skillCategoryName: string;
};

export type SkillOption = {
  id: number;
  skillCategoryId: number;
  skillName: string;
  hasVersion: boolean;
};

export type SkillVersionOption = {
  id: number;
  skillId: number;
  versionName: string;
  isActive: boolean;
};

export type SkillOptions = {
  categories: SkillCategoryOption[];
  skills: SkillOption[];
  versions: SkillVersionOption[];
};

export async function getSkillOptions(): Promise<SkillOptions> {
  const [categories, skills, versions] = await Promise.all([
    prisma.skillCategory.findMany({
      where: { deletedAt: null },
      select: { id: true, skillCategoryName: true },
      orderBy: { skillCategoryName: "asc" },
    }),
    prisma.skill.findMany({
      where: { deletedAt: null },
      select: { id: true, skillCategoryId: true, skillName: true, hasVersion: true },
      orderBy: { skillName: "asc" },
    }),
    prisma.skillVersion.findMany({
      where: { deletedAt: null },
      select: { id: true, skillId: true, versionName: true, isActive: true },
      orderBy: { versionName: "asc" },
    }),
  ]);

  return { categories, skills, versions };
}

// クライアントはdatalistで自由入力を防止しきれないため、送信された各行が
// マスタに実在し、カテゴリ/スキル/バージョンの親子関係とhasVersionの要否に
// 一致しているかをサーバー側で再検証する(docs/decisions.md「スキル・資格・
// マスタ全般」: カテゴリ・スキル名は既存マスタからの選択のみ)。
export function validateSkillRowsAgainstMaster(
  rows: SkillRowInput[],
  options: SkillOptions,
): string | null {
  const categoryIds = new Set(options.categories.map((c) => c.id));
  const skillById = new Map(options.skills.map((s) => [s.id, s]));
  const versionById = new Map(options.versions.map((v) => [v.id, v]));

  for (const row of rows) {
    const categoryId = Number(row.skillCategoryId);
    const skillId = Number(row.skillId);
    const skill = skillById.get(skillId);

    if (!categoryIds.has(categoryId)) {
      return "選択されたカテゴリが見つかりません。";
    }
    if (!skill || skill.skillCategoryId !== categoryId) {
      return "選択されたスキルが見つかりません。";
    }

    if (skill.hasVersion) {
      if (!row.skillVersionId) {
        return `「${skill.skillName}」はバージョンの選択が必須です。`;
      }
      const version = versionById.get(Number(row.skillVersionId));
      if (!version || version.skillId !== skillId) {
        return "選択されたバージョンが見つかりません。";
      }
    } else if (row.skillVersionId) {
      return `「${skill.skillName}」はバージョン管理対象外です。`;
    }
  }

  return null;
}
