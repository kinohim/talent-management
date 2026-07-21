import { redirect } from "next/navigation";

import { ProjectRoleMasterManager } from "@/components/master/ProjectRoleMasterManager";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { prisma } from "@/lib/prisma";

export default async function ProjectRoleMasterPage() {
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

  const roles = await prisma.projectRole.findMany({
    where: { deletedAt: null },
    select: { id: true, projectRoleName: true },
    orderBy: { projectRoleName: "asc" },
  });

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <SectionHeading as="h1" eyebrow="PROJECT ROLES" title="現場ポジションマスタ管理" />
      <ProjectRoleMasterManager roles={roles} />
    </main>
  );
}
