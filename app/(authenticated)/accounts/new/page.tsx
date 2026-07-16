import { redirect } from "next/navigation";

import { NewAccountForm } from "@/components/accounts/NewAccountForm";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { nextEmployeeId } from "@/lib/employee-id";
import { getOrganizationUnitOptions } from "@/lib/organization-unit";
import { prisma } from "@/lib/prisma";

export default async function NewAccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== UserRole.MANAGER) {
    // アカウント管理は管理職専用(home参照)
    redirect("/");
  }

  // 社員IDの初期値(既存最大+1)。IDは6桁ゼロ埋め数字なので辞書順=数値順。
  // ユニーク制約は削除済み行も対象のため、deletedAtで絞らず全行の最大を取る
  const [units, maxEmployee] = await Promise.all([
    getOrganizationUnitOptions(),
    prisma.employee.findFirst({
      orderBy: { employeeId: "desc" },
      select: { employeeId: true },
    }),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">新規アカウント登録</h1>
      <NewAccountForm
        units={units}
        defaultEmployeeId={nextEmployeeId(maxEmployee?.employeeId ?? null)}
      />
    </main>
  );
}
