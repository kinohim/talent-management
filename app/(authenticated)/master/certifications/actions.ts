"use server";

import { revalidatePath } from "next/cache";

import { requireManager } from "@/lib/auth-guards";
import { getCertificationDeleteBlockReason } from "@/lib/certification-master";
import {
  parseCertificationMasterForm,
  type CertificationMasterFormState,
} from "@/lib/certification-master-schema";
import { isUniqueConstraintViolation } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";

const PROGRAM = "MST002";
const PATH = "/master/certifications";

export async function saveCertification(
  certificationId: number | null,
  _prevState: CertificationMasterFormState,
  formData: FormData,
): Promise<CertificationMasterFormState> {
  const user = await requireManager();

  const parsed = parseCertificationMasterForm(formData);
  if (!parsed.success) {
    return { error: parsed.error };
  }
  const { category, certificationName, certificationOrganization } = parsed.data;

  let categoryId: number;
  if (category.mode === "new") {
    const created = await prisma.certificationCategory.create({
      data: {
        certificationCategoryName: category.categoryName,
        createdBy: user.employeeId,
        createdProgram: PROGRAM,
        updatedBy: user.employeeId,
        updatedProgram: PROGRAM,
      },
    });
    categoryId = created.id;
  } else {
    const existing = await prisma.certificationCategory.findFirst({
      where: { id: category.categoryId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      return { error: "カテゴリが見つかりません。" };
    }
    categoryId = existing.id;
  }

  try {
    if (certificationId) {
      await prisma.certification.update({
        where: { id: certificationId },
        data: {
          certificationCategoryId: categoryId,
          certificationName,
          certificationOrganization,
          updatedBy: user.employeeId,
          updatedProgram: PROGRAM,
        },
      });
    } else {
      await prisma.certification.create({
        data: {
          certificationCategoryId: categoryId,
          certificationName,
          certificationOrganization,
          createdBy: user.employeeId,
          createdProgram: PROGRAM,
          updatedBy: user.employeeId,
          updatedProgram: PROGRAM,
        },
      });
    }
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return { error: "既に登録されている資格名です。" };
    }
    return { error: "保存に失敗しました。時間をおいて再度お試しください。" };
  }

  revalidatePath(PATH);
  return { error: null };
}

export async function deleteCertification(
  certificationId: number,
): Promise<{ error: string | null }> {
  const user = await requireManager();

  const blockReason = await getCertificationDeleteBlockReason(certificationId);
  if (blockReason) {
    return { error: blockReason };
  }

  await prisma.certification.update({
    where: { id: certificationId },
    data: {
      deletedAt: new Date(),
      deletedBy: user.employeeId,
      deletedProgram: PROGRAM,
    },
  });

  revalidatePath(PATH);
  return { error: null };
}
