import { redirect } from "next/navigation";

import { SkillMasterManager } from "@/components/master/SkillMasterManager";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { prisma } from "@/lib/prisma";

export default async function SkillMasterPage() {
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

  const [categories, skills] = await Promise.all([
    prisma.skillCategory.findMany({
      where: { deletedAt: null },
      select: { id: true, skillCategoryName: true },
      orderBy: { skillCategoryName: "asc" },
    }),
    prisma.skill.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        skillName: true,
        skillCategoryId: true,
        skillCategory: { select: { skillCategoryName: true } },
        skillVersions: {
          where: { isActive: true, deletedAt: null },
          select: { versionName: true },
          orderBy: { versionName: "asc" },
        },
      },
      orderBy: { skillName: "asc" },
    }),
  ]);

  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.skillCategoryName }));
  const skillRows = skills.map((s) => ({
    id: s.id,
    skillName: s.skillName,
    categoryId: s.skillCategoryId,
    categoryName: s.skillCategory.skillCategoryName,
    versionNames: s.skillVersions.map((v) => v.versionName),
  }));

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <SectionHeading as="h1" eyebrow="SKILLS" title="スキルマスタ管理" />
      <SkillMasterManager categories={categoryOptions} skills={skillRows} />
    </main>
  );
}
