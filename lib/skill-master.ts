import { prisma } from "@/lib/prisma";

export type ExistingSkillVersion = {
  id: number;
  versionName: string;
  isActive: boolean;
};

export type SkillVersionDiffPlan = {
  toCreate: string[];
  toReactivateIds: number[];
  toRemoveIds: number[];
};

// MST001の保存時に、既存バージョン一覧と送信されたタグ名を比較する純粋関数。
// 同名の既存バージョン(active/inactive問わず)があれば再利用(新規重複作成を
// 避ける)。削除対象(toRemoveIds)を物理削除するか非表示化(is_active=false)
// するかはバージョンごとの参照有無に依存するため、呼び出し側(Server Action)が
// 判断する。
export function planSkillVersionDiff(
  existingVersions: ExistingSkillVersion[],
  submittedNames: string[],
): SkillVersionDiffPlan {
  const submittedSet = new Set(submittedNames);
  const existingByName = new Map(existingVersions.map((v) => [v.versionName, v]));

  const toCreate: string[] = [];
  const toReactivateIds: number[] = [];
  for (const name of submittedNames) {
    const existing = existingByName.get(name);
    if (!existing) {
      toCreate.push(name);
    } else if (!existing.isActive) {
      toReactivateIds.push(existing.id);
    }
  }

  const toRemoveIds = existingVersions
    .filter((v) => v.isActive && !submittedSet.has(v.versionName))
    .map((v) => v.id);

  return { toCreate, toReactivateIds, toRemoveIds };
}

// MST001の削除制約(docs/screens.md「使用中のため削除できません」)。
export async function getSkillDeleteBlockReason(skillId: number): Promise<string | null> {
  const [employeeSkillCount, projectSkillCount] = await Promise.all([
    prisma.employeeSkill.count({ where: { skillId } }),
    prisma.projectSkill.count({ where: { skillId } }),
  ]);
  if (employeeSkillCount > 0 || projectSkillCount > 0) {
    return "使用中のため削除できません";
  }
  return null;
}

// バージョン削除(タグ除去)時、社員のスキル登録・プロジェクト経歴から
// 参照されていれば物理削除せず非表示化する(ユーザー確認済みの方針)。
export async function isSkillVersionReferenced(versionId: number): Promise<boolean> {
  const [employeeSkillCount, projectSkillCount] = await Promise.all([
    prisma.employeeSkill.count({ where: { skillVersionId: versionId } }),
    prisma.projectSkill.count({ where: { skillVersionId: versionId } }),
  ]);
  return employeeSkillCount > 0 || projectSkillCount > 0;
}
