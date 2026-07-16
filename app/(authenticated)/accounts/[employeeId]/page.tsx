import { redirect } from "next/navigation";

import { EditAccountForm } from "@/components/accounts/EditAccountForm";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { employeeDisplayName } from "@/lib/employee-labels";
import { getOrganizationUnitOptions, resolveSelectionFromLeaf } from "@/lib/organization-unit";
import { prisma } from "@/lib/prisma";

type EditAccountPageProps = {
  params: Promise<{ employeeId: string }>;
};

export default async function EditAccountPage({ params }: EditAccountPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== UserRole.MANAGER) {
    // アカウント管理は管理職専用(home参照)
    redirect("/");
  }

  const { employeeId } = await params;

  const employee = await prisma.employee.findFirst({
    where: { employeeId, deletedAt: null },
    include: { user: true },
  });
  if (!employee || !employee.user) {
    redirect("/accounts");
  }

  const units = await getOrganizationUnitOptions();
  const orgSelection = resolveSelectionFromLeaf(units, employee.organizationUnitId);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">アカウント編集</h1>
      <EditAccountForm
        employeeId={employee.employeeId}
        displayName={
          employeeDisplayName(employee.name, employee.isRegistered) ?? "(未登録)"
        }
        isRegistered={employee.isRegistered}
        name={employee.name ?? ""}
        email={employee.user.email}
        role={employee.user.role}
        employmentStatus={employee.employmentStatus}
        units={units}
        orgSelection={orgSelection}
      />
    </main>
  );
}
