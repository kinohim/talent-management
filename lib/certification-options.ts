import { prisma } from "@/lib/prisma";
import type { CertificationRowInput } from "@/lib/certification-schema";

export type CertificationCategoryOption = {
  id: number;
  certificationCategoryName: string;
};

export type CertificationOption = {
  id: number;
  certificationCategoryId: number;
  certificationName: string;
  certificationOrganization: string;
};

export type CertificationOptions = {
  categories: CertificationCategoryOption[];
  certifications: CertificationOption[];
};

export async function getCertificationOptions(): Promise<CertificationOptions> {
  const [categories, certifications] = await Promise.all([
    prisma.certificationCategory.findMany({
      where: { deletedAt: null },
      select: { id: true, certificationCategoryName: true },
      orderBy: { certificationCategoryName: "asc" },
    }),
    prisma.certification.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        certificationCategoryId: true,
        certificationName: true,
        certificationOrganization: true,
      },
      orderBy: { certificationName: "asc" },
    }),
  ]);

  return { categories, certifications };
}

// クライアントはdatalistで自由入力を防止しきれないため、送信された各行が
// マスタに実在し、カテゴリ/資格名の親子関係に一致しているかをサーバー側で
// 再検証する(docs/decisions.md「スキル・資格・マスタ全般」: カテゴリ・資格名は
// 既存マスタからの選択のみ)。
export function validateCertificationRowsAgainstMaster(
  rows: CertificationRowInput[],
  options: CertificationOptions,
): string | null {
  const categoryIds = new Set(options.categories.map((c) => c.id));
  const certificationById = new Map(
    options.certifications.map((c) => [c.id, c]),
  );

  for (const row of rows) {
    const categoryId = Number(row.certificationCategoryId);
    const certificationId = Number(row.certificationId);
    const certification = certificationById.get(certificationId);

    if (!categoryIds.has(categoryId)) {
      return "選択されたカテゴリが見つかりません。";
    }
    if (!certification || certification.certificationCategoryId !== categoryId) {
      return "選択された資格が見つかりません。";
    }
  }

  return null;
}
