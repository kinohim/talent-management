import { prisma } from "@/lib/prisma";

// MST002の削除制約(docs/screens.md「使用中のため削除できません」)。
export async function getCertificationDeleteBlockReason(
  certificationId: number,
): Promise<string | null> {
  const count = await prisma.employeeCertification.count({
    where: { certificationId },
  });
  if (count > 0) {
    return "使用中のため削除できません";
  }
  return null;
}
