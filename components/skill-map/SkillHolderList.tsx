import Link from "next/link";

export type SkillHolderDisplay = { employeeId: string; name: string; canView: boolean };

export type SkillHolderRow = {
  key: string;
  label: string;
  holders: SkillHolderDisplay[];
};

export type SkillHolderGroup = {
  key: string;
  label: string | null;
  rows: SkillHolderRow[];
};

type SkillHolderListProps = {
  groups: SkillHolderGroup[];
  totalCount: number;
  emptyMessage: string;
};

// REF008のスキル/資格別保有者数集計表示。項目ごとに保有率のバー(Tailwindのみ、
// 母数=集計対象社員数)を表示し、<details>で保有者名を展開できる。保有者名は
// canViewに応じてREF003へのリンクかプレーンテキストかを出し分ける
// (docs/decisions.md: 氏名は全ロールに表示するが遷移可否は閲覧範囲ルールに従う)。
export function SkillHolderList({ groups, totalCount, emptyMessage }: SkillHolderListProps) {
  if (groups.every((group) => group.rows.length === 0)) {
    return <p className="text-sm text-zinc-500">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) =>
        group.rows.length === 0 ? null : (
          <div key={group.key} className="flex flex-col gap-2">
            {group.label != null ? (
              <h3 className="text-sm font-semibold">{group.label}</h3>
            ) : null}
            <div className="flex flex-col gap-1">
              {group.rows.map((row) => {
                const pct =
                  totalCount > 0 ? Math.round((row.holders.length / totalCount) * 100) : 0;
                return (
                  <details key={row.key} className="rounded border p-2">
                    <summary className="flex cursor-pointer items-center gap-2 text-sm">
                      <span className="w-40 shrink-0 truncate">{row.label}</span>
                      <span className="h-2 flex-1 rounded bg-zinc-100 dark:bg-zinc-800">
                        <span
                          className="block h-2 rounded bg-zinc-900 dark:bg-zinc-100"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="w-12 shrink-0 text-right text-zinc-500">
                        {row.holders.length}名
                      </span>
                    </summary>
                    <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-2 pl-2 text-sm">
                      {row.holders.map((holder) => (
                        <li key={holder.employeeId}>
                          {holder.canView ? (
                            <Link
                              href={`/resumes/${holder.employeeId}`}
                              className="hover:underline"
                            >
                              {holder.name}
                            </Link>
                          ) : (
                            holder.name
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                );
              })}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
