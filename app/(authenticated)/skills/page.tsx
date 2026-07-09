import { redirect } from "next/navigation";

import { SkillRowsForm } from "@/components/skills/SkillRowsForm";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { prisma } from "@/lib/prisma";
import { getSkillOptions } from "@/lib/skill-options";

export default async function SkillsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role === UserRole.HR_SALES) {
    // 人事・営業は経歴書を作成しないため対象外(REF001参照)
    redirect("/");
  }

  // 基本情報未登録のままの直接アクセスもEDT001へ戻す(mypageと同じ方針)。
  const destination = await resolveDestination(session.user);
  if (destination !== "/") {
    redirect(destination);
  }

  const [options, employeeSkills] = await Promise.all([
    getSkillOptions(),
    prisma.employeeSkill.findMany({
      where: { employeeId: session.user.employeeId },
      include: { skill: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const initialRows = employeeSkills.map((employeeSkill) => ({
    skillCategoryId: String(employeeSkill.skill.skillCategoryId),
    skillId: String(employeeSkill.skillId),
    skillNameInput: employeeSkill.skill.skillName,
    skillVersionId: employeeSkill.skillVersionId
      ? String(employeeSkill.skillVersionId)
      : "",
    skillLevel: employeeSkill.skillLevel,
  }));

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">スキル登録</h1>
      <SkillRowsForm options={options} initialRows={initialRows} />
    </main>
  );
}
