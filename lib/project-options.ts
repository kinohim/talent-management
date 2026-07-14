import { prisma } from "@/lib/prisma";
import type { SkillOptions } from "@/lib/skill-options";
import type { ProjectFormInput, ProjectSkillRowInput } from "@/lib/project-schema";

export type SiteOption = {
  id: number;
  siteName: string;
};

export type ProjectRoleOption = {
  id: number;
  projectRoleName: string;
};

export type ProjectOptions = {
  sites: SiteOption[];
  roles: ProjectRoleOption[];
};

// REF002の「携わったプロジェクト(現場)」検索用。役割は不要なため現場のみを取る。
export async function getSiteOptions(): Promise<SiteOption[]> {
  return prisma.site.findMany({
    where: { deletedAt: null },
    select: { id: true, siteName: true },
    orderBy: { siteName: "asc" },
  });
}

export async function getProjectOptions(): Promise<ProjectOptions> {
  const [sites, roles] = await Promise.all([
    prisma.site.findMany({
      where: { deletedAt: null },
      select: { id: true, siteName: true },
      orderBy: { siteName: "asc" },
    }),
    prisma.projectRole.findMany({
      where: { deletedAt: null },
      select: { id: true, projectRoleName: true },
      orderBy: { projectRoleName: "asc" },
    }),
  ]);

  return { sites, roles };
}

// クライアントはdatalist/チェックボックスで自由入力を防止しきれないため、送信された
// 現場・役割がマスタに実在するかをサーバー側で再検証する。
export function validateProjectFormAgainstMaster(
  data: Pick<ProjectFormInput, "siteId" | "roleIds">,
  options: ProjectOptions,
): string | null {
  const siteIds = new Set(options.sites.map((s) => s.id));
  const roleIds = new Set(options.roles.map((r) => r.id));

  if (!siteIds.has(Number(data.siteId))) {
    return "選択された現場が見つかりません。";
  }
  for (const roleId of data.roleIds) {
    if (!roleIds.has(Number(roleId))) {
      return "選択された役割が見つかりません。";
    }
  }

  return null;
}

// 使用スキルのタグ入力もEDT003(スキル登録)と同様にマスタ実在・カテゴリの親子関係・
// hasVersionの要否をサーバー側で再検証する(docs/decisions.md「スキル・資格・マスタ
// 全般」)。
export function validateProjectSkillsAgainstMaster(
  rows: ProjectSkillRowInput[],
  skillOptions: SkillOptions,
): string | null {
  const categoryIds = new Set(skillOptions.categories.map((c) => c.id));
  const skillById = new Map(skillOptions.skills.map((s) => [s.id, s]));
  const versionById = new Map(skillOptions.versions.map((v) => [v.id, v]));

  for (const row of rows) {
    const categoryId = Number(row.skillCategoryId);
    const skill = skillById.get(Number(row.skillId));
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
      if (!version || version.skillId !== skill.id) {
        return "選択されたバージョンが見つかりません。";
      }
    } else if (row.skillVersionId) {
      return `「${skill.skillName}」はバージョン管理対象外です。`;
    }
  }

  return null;
}
