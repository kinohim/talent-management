import { prisma } from "@/lib/prisma";

// MST005の削除制約(docs/screens.md「使用中のため削除できません」)。
// projectは`deleteProject`(プロジェクト削除)でdeletedAtが付与される(論理削除)
// ため、deletedAt: nullで絞り込み、既に削除されたプロジェクトの残骸を
// 「使用中」と誤判定しないようにする(lib/skill-master.ts等と同じ理由)。
export async function getSiteDeleteBlockReason(siteId: number): Promise<string | null> {
  const count = await prisma.project.count({
    where: { siteId, deletedAt: null },
  });
  if (count > 0) {
    return "使用中のため削除できません";
  }
  return null;
}
