import { redirect } from "next/navigation";

import { CareerSummaryForm } from "@/components/career-summary/CareerSummaryForm";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { prisma } from "@/lib/prisma";

export default async function CareerSummaryPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role === UserRole.HR_SALES) {
    // 人事・営業は経歴書を作成しないため対象外(REF001参照)
    redirect("/");
  }

  // 基本情報未登録のままの直接アクセスもEDT001へ戻す(mypageと同じ方針)。
  const destination = await resolveDestination(session.user);
  if (destination !== "/") {
    redirect(destination);
  }

  const employee = await prisma.employee.findUnique({
    where: { employeeId: session.user.employeeId },
  });
  if (!employee) {
    // users<->employeeはFKで保証されるため通常到達しない
    redirect("/login");
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">経歴概要・自己PR登録</h1>
      <CareerSummaryForm
        defaultValues={{
          careerSummary: employee.careerSummary ?? "",
          selfPr: employee.selfPr ?? "",
        }}
      />
    </main>
  );
}
