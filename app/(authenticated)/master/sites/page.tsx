import { redirect } from "next/navigation";

import { SiteMasterManager } from "@/components/master/SiteMasterManager";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { prisma } from "@/lib/prisma";

export default async function SiteMasterPage() {
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

  const [sites, departmentUnits] = await Promise.all([
    prisma.site.findMany({
      where: { deletedAt: null },
      select: { id: true, siteName: true, organizationUnitId: true },
      orderBy: { siteName: "asc" },
    }),
    // 主管部署の選択肢は部(DEPARTMENT)のみ。同名部が別事業部にあり得るため
    // 「事業部 / 部」の形式で表示する
    prisma.organizationUnit.findMany({
      where: { unitLevel: "DEPARTMENT", deletedAt: null },
      select: { id: true, unitName: true, parent: { select: { unitName: true } } },
      orderBy: [{ parentId: "asc" }, { unitName: "asc" }],
    }),
  ]);

  const departments = departmentUnits.map((unit) => ({
    id: unit.id,
    name: unit.parent ? `${unit.parent.unitName} / ${unit.unitName}` : unit.unitName,
  }));

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">現場マスタ管理</h1>
      <SiteMasterManager sites={sites} departments={departments} />
    </main>
  );
}
