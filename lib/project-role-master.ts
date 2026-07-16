import { prisma } from "@/lib/prisma";

// master-project-rolesの削除制約(docs/screens.md「使用中のため削除できません」)。
// projectRoleLinkは`deleteProject`(プロジェクト削除)でdeletedAtが付与される
// (論理削除)ため、deletedAt: nullで絞り込み、既に削除されたプロジェクトの
// 残骸を「使用中」と誤判定しないようにする(lib/skill-master.tsと同じ理由)。
export async function getProjectRoleDeleteBlockReason(
  projectRoleId: number,
): Promise<string | null> {
  const count = await prisma.projectRoleLink.count({
    where: { projectRoleId, deletedAt: null },
  });
  if (count > 0) {
    return "使用中のため削除できません";
  }
  return null;
}
