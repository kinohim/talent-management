import { redirect } from "next/navigation";

import { OrganizationUnitManager } from "@/components/master/OrganizationUnitManager";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { getOrganizationUnitOptions } from "@/lib/organization-unit";
import { buildOrganizationUnitTree } from "@/lib/organization-unit-tree";

export default async function OrganizationUnitsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  // 未登録の管理職はbasic-info(初回登録)へ誘導する(全認証必須ページ共通のガード)
  const destination = await resolveDestination(session.user);
  if (destination !== "/") {
    redirect(destination);
  }
  if (session.user.role !== UserRole.MANAGER) {
    // マスタ管理は管理職専用(home参照)
    redirect("/");
  }

  const units = await getOrganizationUnitOptions();
  const tree = buildOrganizationUnitTree(units);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <SectionHeading as="h1" eyebrow="ORGANIZATION" title="部署マスタ管理" />
      <OrganizationUnitManager tree={tree} />
    </main>
  );
}
