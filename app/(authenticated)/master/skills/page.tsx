import { redirect } from "next/navigation";

import { SkillMasterManager } from "@/components/master/SkillMasterManager";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SkillMasterPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== UserRole.MANAGER) {
    // マスタ管理は管理職専用(REF001参照)
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
      <h1 className="text-lg font-semibold">スキルマスタ管理</h1>
      <SkillMasterManager categories={categoryOptions} skills={skillRows} />
    </main>
  );
}
