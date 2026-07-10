"use server";

import { redirect } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import {
  getCertificationOptions,
  validateCertificationRowsAgainstMaster,
} from "@/lib/certification-options";
import {
  parseCertificationRowsForm,
  type CertificationRowFieldErrors,
} from "@/lib/certification-schema";
import { parseDateOnly } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";

export type CertificationFormState = {
  rowErrors: Record<number, CertificationRowFieldErrors>;
  formError: string | null;
};

export async function saveCertifications(
  _prevState: CertificationFormState,
  formData: FormData,
): Promise<CertificationFormState> {
  const session = await auth();
  if (!session?.user || session.user.role === UserRole.HR_SALES) {
    // 人事・営業や未ログインでの直接アクセスは想定外の防御的分岐
    redirect("/login");
  }

  const parsed = parseCertificationRowsForm(formData);
  if (!parsed.success) {
    return { rowErrors: parsed.rowErrors, formError: parsed.formError };
  }

  const options = await getCertificationOptions();
  const masterError = validateCertificationRowsAgainstMaster(
    parsed.rows,
    options,
  );
  if (masterError) {
    return { rowErrors: {}, formError: masterError };
  }

  const employeeId = session.user.employeeId;

  try {
    await prisma.$transaction([
      prisma.employeeCertification.deleteMany({ where: { employeeId } }),
      prisma.employeeCertification.createMany({
        data: parsed.rows.map((row) => ({
          employeeId,
          certificationId: Number(row.certificationId),
          acquiredDate: parseDateOnly(row.acquiredDate),
          expirationDate: row.expirationDate
            ? parseDateOnly(row.expirationDate)
            : null,
          createdBy: employeeId,
          createdProgram: "EDT004",
          updatedBy: employeeId,
          updatedProgram: "EDT004",
        })),
      }),
    ]);
  } catch {
    return {
      rowErrors: {},
      formError: "保存に失敗しました。時間をおいて再度お試しください。",
    };
  }

  // 保存後はREF004(マイページ)へ遷移する(docs/screens.md「保存後の遷移先
  // (共通ルール)」参照)。
  redirect("/mypage");
}
