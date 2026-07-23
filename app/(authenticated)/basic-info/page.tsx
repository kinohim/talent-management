import { redirect } from "next/navigation";

import { BasicInfoForm } from "@/components/basic-info/BasicInfoForm";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { toDateInputValue, toMonthInputValue } from "@/lib/date-format";
import {
  getOrganizationUnitOptions,
  resolveSelectionFromLeaf,
} from "@/lib/organization-unit";
import { prisma } from "@/lib/prisma";

export default async function BasicInfoRegisterPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role === UserRole.HR_SALES) {
    // 人事・営業は経歴書を作成しないため対象外(home参照)
    redirect("/");
  }

  const employee = await prisma.employee.findUnique({
    where: { employeeId: session.user.employeeId },
  });
  if (!employee) {
    // users<->employeeはFKで保証されるため通常到達しない
    redirect("/login");
  }

  const units = await getOrganizationUnitOptions();
  const selection = resolveSelectionFromLeaf(units, employee.organizationUnitId);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">基本情報登録</h1>
      <BasicInfoForm
        variant="register"
        employeeId={session.user.employeeId}
        email={session.user.email ?? ""}
        defaultValues={{
          name: employee.name ?? session.user.name ?? "",
          nameKana: employee.nameKana ?? "",
          birthDate: toDateInputValue(employee.birthDate),
          gender: employee.gender,
          nearestStationPrefecture: employee.nearestStationPrefecture ?? "",
          nearestStationLine: employee.nearestStationLine ?? "",
          nearestStationName: employee.nearestStationName ?? "",
          finalSchoolType: employee.finalSchoolType,
          finalSchoolName: employee.finalSchoolName ?? "",
          finalDepartmentName: employee.finalDepartmentName ?? "",
          graduationStatus: employee.graduationStatus,
          graduationYearMonth: toMonthInputValue(employee.graduationYearMonth),
        }}
        units={units}
        selection={selection}
      />
    </main>
  );
}
