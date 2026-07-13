import { redirect } from "next/navigation";

import { NewAccountForm } from "@/components/accounts/NewAccountForm";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { getOrganizationUnitOptions } from "@/lib/organization-unit";

export default async function NewAccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== UserRole.MANAGER) {
    // アカウント管理は管理職専用(REF001参照)
    redirect("/");
  }

  const units = await getOrganizationUnitOptions();

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">新規アカウント登録</h1>
      <NewAccountForm units={units} />
    </main>
  );
}
