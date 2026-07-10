import { redirect } from "next/navigation";

import { CertificationRowsForm } from "@/components/certifications/CertificationRowsForm";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { getCertificationOptions } from "@/lib/certification-options";
import { toDateInputValue } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";

export default async function CertificationsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role === UserRole.HR_SALES) {
    // 人事・営業は経歴書を作成しないため対象外(REF001参照)
    redirect("/");
  }

  // 基本情報未登録のままの直接アクセスもEDT001へ戻す(mypage/skillsと同じ方針)。
  const destination = await resolveDestination(session.user);
  if (destination !== "/") {
    redirect(destination);
  }

  const [options, employeeCertifications] = await Promise.all([
    getCertificationOptions(),
    prisma.employeeCertification.findMany({
      where: { employeeId: session.user.employeeId },
      include: { certification: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const initialRows = employeeCertifications.map((employeeCertification) => ({
    certificationCategoryId: String(
      employeeCertification.certification.certificationCategoryId,
    ),
    certificationId: String(employeeCertification.certificationId),
    certificationNameInput: employeeCertification.certification.certificationName,
    acquiredDate: toDateInputValue(employeeCertification.acquiredDate),
    expirationDate: toDateInputValue(employeeCertification.expirationDate),
  }));

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">資格登録</h1>
      <CertificationRowsForm options={options} initialRows={initialRows} />
    </main>
  );
}
