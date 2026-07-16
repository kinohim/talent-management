import { redirect } from "next/navigation";

import { ProjectRoleMasterManager } from "@/components/master/ProjectRoleMasterManager";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProjectRoleMasterPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== UserRole.MANAGER) {
    // マスタ管理は管理職専用(home参照)
    redirect("/");
  }

  const roles = await prisma.projectRole.findMany({
    where: { deletedAt: null },
    select: { id: true, projectRoleName: true },
    orderBy: { projectRoleName: "asc" },
  });

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">現場ポジションマスタ管理</h1>
      <ProjectRoleMasterManager roles={roles} />
    </main>
  );
}
