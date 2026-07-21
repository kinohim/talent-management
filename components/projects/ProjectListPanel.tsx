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
        <h2 className="text-base font-semibold text-brand">プロジェクト経歴</h2>
        <Link
          href="/projects/new"
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary-dark"
        >
          + 新規追加
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-foreground/60">
          登録済みのプロジェクト経歴はありません。「新規追加」から登録してください。
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="flex flex-col gap-1 rounded-2xl border border-surface-border p-4 hover:border-primary hover:bg-primary/10"
              >
                <span className="text-sm text-foreground/60">
                  {toMonthInputValue(project.startDate)} 〜{" "}
                  {project.endDate ? toMonthInputValue(project.endDate) : "現在"}
                </span>
                <span className="font-medium">{project.siteName}</span>
                <span className="text-sm text-foreground/60">
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
