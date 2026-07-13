import Link from "next/link";

export type ResumeSearchResultRow = {
  employeeId: string;
  name: string;
  organizationUnitName: string | null;
  experienceYears: number | null;
  mainSkills: string;
};

export function ResumeSearchResultTable({ rows }: { rows: ResumeSearchResultRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">該当する経歴書はありません。</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">氏名</th>
            <th className="p-2">所属組織</th>
            <th className="p-2">経験年数</th>
            <th className="p-2">主なスキル</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.employeeId} className="border-b">
              <td className="p-2">{row.name}</td>
              <td className="p-2">{row.organizationUnitName ?? "未所属"}</td>
              <td className="p-2">
                {row.experienceYears != null ? `${row.experienceYears}年` : "-"}
              </td>
              <td className="p-2">{row.mainSkills || "-"}</td>
              <td className="p-2">
                <Link
                  href={`/resumes/${row.employeeId}`}
                  className="rounded border px-3 py-1"
                >
                  詳細
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
