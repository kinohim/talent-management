import Link from "next/link";

import { toMonthInputValue } from "@/lib/date-format";

export type ProjectListItem = {
  id: number;
  startDate: Date;
  endDate: Date | null;
  siteName: string;
  roleNames: string[];
};

// mypage「私の経歴書」[実績]タブのプロジェクト経歴一覧。新規登録・編集は
// 従来どおりproject-form(/projects/new・/projects/[id])へ遷移する。
export function ProjectListPanel({ projects }: { projects: ProjectListItem[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">プロジェクト経歴</h2>
        <Link
          href="/projects/new"
          className="rounded bg-zinc-900 hover:bg-zinc-700 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:hover:bg-zinc-300 dark:text-zinc-900"
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
                <span className="font-medium">{project.siteName}</span>
                <span className="text-sm text-zinc-500">
                  {project.roleNames.join("、")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
