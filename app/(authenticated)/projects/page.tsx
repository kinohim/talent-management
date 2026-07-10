import Link from "next/link";
import { redirect } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { toMonthInputValue } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role === UserRole.HR_SALES) {
    // 人事・営業は経歴書を作成しないため対象外(REF001参照)
    redirect("/");
  }

  // 基本情報未登録のままの直接アクセスもEDT001へ戻す(mypage/skillsと同じ方針)。
  const destination = await resolveDestination(session.user);
  if (destination !== "/") {
    redirect(destination);
  }

  const projects = await prisma.project.findMany({
    where: { employeeId: session.user.employeeId, deletedAt: null },
    include: {
      site: true,
      projectRoleLinks: { include: { projectRole: true } },
    },
    orderBy: { startDate: "desc" },
  });

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">プロジェクト経歴一覧</h1>
        <Link
          href="/projects/new"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          + 新規追加
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-zinc-500">
          登録済みのプロジェクト経歴はありません。「新規追加」から登録してください。
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="flex flex-col gap-1 rounded border p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <span className="text-sm text-zinc-500">
                  {toMonthInputValue(project.startDate)} 〜{" "}
                  {project.endDate ? toMonthInputValue(project.endDate) : "現在"}
                </span>
                <span className="font-medium">{project.site.siteName}</span>
                <span className="text-sm text-zinc-500">
                  {project.projectRoleLinks
                    .map((link) => link.projectRole.projectRoleName)
                    .join("、")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
