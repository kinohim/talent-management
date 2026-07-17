import Link from "next/link";

import { DataTableHeaderCell } from "@/components/ui/DataTableHeaderCell";

export type ResumeSearchResultRow = {
  employeeId: string;
  name: string;
  organizationUnitName: string | null;
  experienceYears: number | null;
  mainSkills: string;
  mainCertifications: string;
  // 一般社員の閲覧範囲外の行はfalse(「詳細」リンクを出さない)。判定はページ側
  canViewDetail: boolean;
};

type ResumeSearchResultTableProps = {
  rows: ResumeSearchResultRow[];
  // 列フィルタ「所属組織」の選択肢
  orgFilterOptions: { value: string; label: string }[];
  // 列フィルタ「主なスキル」「主な資格」の選択肢(マスタ全件)
  skillFilterOptions: { value: string; label: string }[];
  certificationFilterOptions: { value: string; label: string }[];
};

// 0件時もヘッダは表示し続ける(列フィルタで0件になった場合に、ヘッダから
// フィルタを解除できる必要があるため)。
export function ResumeSearchResultTable({
  rows,
  orgFilterOptions,
  skillFilterOptions,
  certificationFilterOptions,
}: ResumeSearchResultTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <DataTableHeaderCell
              label="氏名"
              sortKey="name"
              filter={{ type: "text", paramKey: "colName" }}
            />
            <DataTableHeaderCell
              label="所属組織"
              sortKey="org"
              filter={{ type: "enum", paramKey: "colOrg", options: orgFilterOptions }}
            />
            <DataTableHeaderCell
              label="経験年数"
              sortKey="experience"
              filter={{
                type: "numberRange",
                minParamKey: "colExpMin",
                maxParamKey: "colExpMax",
              }}
            />
            <DataTableHeaderCell
              label="主なスキル"
              filter={{
                type: "tagCondition",
                paramKey: "colSkillId",
                modeParamKey: "colSkillMode",
                options: skillFilterOptions,
              }}
            />
            <DataTableHeaderCell
              label="主な資格"
              filter={{
                type: "tagCondition",
                paramKey: "colCertificationId",
                modeParamKey: "colCertificationMode",
                options: certificationFilterOptions,
              }}
            />
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-4 text-center text-zinc-500">
                該当する経歴書はありません。
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.employeeId} className="border-b">
                <td className="p-2">{row.name}</td>
                <td className="p-2">{row.organizationUnitName ?? "未所属"}</td>
                <td className="p-2">
                  {row.experienceYears != null ? `${row.experienceYears}年` : "-"}
                </td>
                <td className="p-2">{row.mainSkills || "-"}</td>
                <td className="p-2">{row.mainCertifications || "-"}</td>
                <td className="p-2">
                  {row.canViewDetail && (
                    <Link
                      href={`/resumes/${row.employeeId}`}
                      className="rounded border px-3 py-1"
                    >
                      詳細
                    </Link>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
