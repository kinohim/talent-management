"use server";

import { revalidatePath } from "next/cache";

import { requireManager } from "@/lib/auth-guards";
import { getCertificationDeleteBlockReason } from "@/lib/certification-master";
import {
  parseCategoryNameForm,
  parseCertificationMasterForm,
  type CertificationMasterFormState,
} from "@/lib/certification-master-schema";
import { isUniqueConstraintViolation } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";

const PROGRAM = "MST002";
const PATH = "/master/certifications";

// MST002の「カテゴリを追加」(カテゴリのみ新規作成)。資格の追加は
// カテゴリ見出しごとのフォームからsaveCertificationで行う。
export async function createCertificationCategory(
  _prevState: CertificationMasterFormState,
  formData: FormData,
): Promise<CertificationMasterFormState> {
  const user = await requireManager();

  const parsed = parseCategoryNameForm(formData);
  if (!parsed.success) {
    return { error: parsed.error };
  }
  const categoryName = parsed.data;

  // 有効な同名カテゴリの重複を事前チェック(DB制約のP2002より分かりやすい
  // タイミングでエラーを返す)。
  const activeSameName = await prisma.certificationCategory.findFirst({
    where: { certificationCategoryName: categoryName, deletedAt: null },
    select: { id: true },
  });
  if (activeSameName) {
    return { error: "既に登録されているカテゴリ名です。" };
  }

  // カテゴリ名はユニーク(deletedAtを問わないDB制約)なため、論理削除済みの
  // 同名行が残っていれば新規作成ではなく復活させる(saveCertificationと同じ流儀)。
  const deletedToReactivate = await prisma.certificationCategory.findFirst({
    where: {
      certificationCategoryName: categoryName,
      deletedAt: { not: null },
    },
    select: { id: true },
  });

  try {
    if (deletedToReactivate) {
      await prisma.certificationCategory.update({
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
      await prisma.certificationCategory.create({
        data: {
          certificationCategoryName: categoryName,
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
    // カテゴリ名は各マスタ内で一意。有効な同名があればエラー、
    // 論理削除済みの同名があれば復活して使う(createCertificationCategoryと同じ流儀)。
    const sameName = await prisma.certificationCategory.findFirst({
      where: { certificationCategoryName: category.categoryName },
      select: { id: true, deletedAt: true },
    });
    if (sameName && sameName.deletedAt === null) {
      return { error: "既に登録されているカテゴリ名です。" };
    }
    if (sameName) {
      await prisma.certificationCategory.update({
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
    }
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

  // certification_nameはシステム全体でユニーク(deletedAtを問わないDB制約)なため、
  // 論理削除済みの同名行が残っていると新規createがユニーク制約違反になる。
  // その場合は新規作成ではなく、削除済み行を復活させる。
  const deletedCertificationToReactivate = certificationId
    ? null
    : await prisma.certification.findFirst({
        where: { certificationName, deletedAt: { not: null } },
        select: { id: true },
      });

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
    } else if (deletedCertificationToReactivate) {
      await prisma.certification.update({
        where: { id: deletedCertificationToReactivate.id },
        data: {
          certificationCategoryId: categoryId,
          certificationName,
          certificationOrganization,
          deletedAt: null,
          deletedBy: null,
          deletedProgram: null,
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
