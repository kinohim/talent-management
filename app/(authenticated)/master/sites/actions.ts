"use server";

import { revalidatePath } from "next/cache";

import { requireManager } from "@/lib/auth-guards";
import { isUniqueConstraintViolation } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
import { getSiteDeleteBlockReason } from "@/lib/site-master";
import { parseSiteMasterForm, type SiteMasterFormState } from "@/lib/site-master-schema";

const PROGRAM = "MST005";
const PATH = "/master/sites";

export async function saveSite(
  siteId: number | null,
  _prevState: SiteMasterFormState,
  formData: FormData,
): Promise<SiteMasterFormState> {
  const user = await requireManager();

  const parsed = parseSiteMasterForm(formData);
  if (!parsed.success) {
    return { error: parsed.error };
  }

  // site_nameはシステム全体でユニーク(deletedAtを問わないDB制約)なため、
  // 論理削除済みの同名行が残っていると新規createがユニーク制約違反になる。
  // その場合は新規作成ではなく、削除済み行を復活させる。
  const deletedSiteToReactivate = siteId
    ? null
    : await prisma.site.findFirst({
        where: { siteName: parsed.siteName, deletedAt: { not: null } },
        select: { id: true },
      });

  try {
    if (siteId) {
      await prisma.site.update({
        where: { id: siteId },
        data: {
          siteName: parsed.siteName,
          updatedBy: user.employeeId,
          updatedProgram: PROGRAM,
        },
      });
    } else if (deletedSiteToReactivate) {
      await prisma.site.update({
        where: { id: deletedSiteToReactivate.id },
        data: {
          siteName: parsed.siteName,
          deletedAt: null,
          deletedBy: null,
          deletedProgram: null,
          updatedBy: user.employeeId,
          updatedProgram: PROGRAM,
        },
      });
    } else {
      await prisma.site.create({
        data: {
          siteName: parsed.siteName,
          createdBy: user.employeeId,
          createdProgram: PROGRAM,
          updatedBy: user.employeeId,
          updatedProgram: PROGRAM,
        },
      });
    }
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return { error: "既に登録されている現場名です。" };
    }
    return { error: "保存に失敗しました。時間をおいて再度お試しください。" };
  }

  revalidatePath(PATH);
  return { error: null };
}

export async function deleteSite(siteId: number): Promise<{ error: string | null }> {
  const user = await requireManager();

  const blockReason = await getSiteDeleteBlockReason(siteId);
  if (blockReason) {
    return { error: blockReason };
  }

  await prisma.site.update({
    where: { id: siteId },
    data: {
      deletedAt: new Date(),
      deletedBy: user.employeeId,
      deletedProgram: PROGRAM,
    },
  });

  revalidatePath(PATH);
  return { error: null };
}
