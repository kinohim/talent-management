import { redirect } from "next/navigation";

import { SiteMasterManager } from "@/components/master/SiteMasterManager";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SiteMasterPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== UserRole.MANAGER) {
    // マスタ管理は管理職専用(REF001参照)
    redirect("/");
  }

  const sites = await prisma.site.findMany({
    where: { deletedAt: null },
    select: { id: true, siteName: true },
    orderBy: { siteName: "asc" },
  });

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">現場マスタ管理</h1>
      <SiteMasterManager sites={sites} />
    </main>
  );
}
