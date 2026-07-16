import type { SkillLevel } from "@/generated/prisma/client";
import {
  PROCESS_FLAG_KEYS,
  PROCESS_FLAG_LABELS,
  type ProcessFlagKey,
} from "@/lib/project-schema";

export type SkillCategoryGroup = {
  skillCategoryName: string;
  items: {
    skillName: string;
    versionName: string | null;
    skillLevel: SkillLevel;
  }[];
};

type EmployeeSkillForGrouping = {
  skill: { skillName: string; skillCategory: { skillCategoryName: string } };
  skillVersion: { versionName: string } | null;
  skillLevel: SkillLevel;
};

// employeeSkillsはPrisma側でカテゴリ名→スキル名の昇順にソート済みの前提で、
// 連続する同カテゴリをまとめる(resume-detailのスキル一覧をカテゴリ別に表示するため)。
export function groupSkillsByCategory(
  employeeSkills: EmployeeSkillForGrouping[],
): SkillCategoryGroup[] {
  const groups: SkillCategoryGroup[] = [];
  for (const employeeSkill of employeeSkills) {
    const categoryName = employeeSkill.skill.skillCategory.skillCategoryName;
    const item = {
      skillName: employeeSkill.skill.skillName,
      versionName: employeeSkill.skillVersion?.versionName ?? null,
      skillLevel: employeeSkill.skillLevel,
    };
    const last = groups[groups.length - 1];
    if (last && last.skillCategoryName === categoryName) {
      last.items.push(item);
    } else {
      groups.push({ skillCategoryName: categoryName, items: [item] });
    }
  }
  return groups;
}

// 担当工程のうちtrueのものだけを日本語ラベルの配列にする(resume-detailのプロジェクト
// 経歴カード表示用)。
export function buildProcessFlagLabels(
  detail: Record<ProcessFlagKey, boolean | null> | null | undefined,
): string[] {
  if (!detail) return [];
  return PROCESS_FLAG_KEYS.filter((key) => detail[key]).map(
    (key) => PROCESS_FLAG_LABELS[key],
  );
}

// スキル名にバージョンがあれば"TypeScript(5.x)"のように連結する。
export function formatSkillWithVersion(
  skillName: string,
  versionName: string | null,
): string {
  return versionName ? `${skillName}(${versionName})` : skillName;
}
