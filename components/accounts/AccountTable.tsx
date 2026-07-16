import Link from "next/link";

import { DataTableHeaderCell } from "@/components/ui/DataTableHeaderCell";
import type { UserRole } from "@/generated/prisma/client";
import { employeeDisplayName } from "@/lib/employee-labels";
import { accountStatusLabel, type AccountStatus } from "@/lib/account-list";
import { toDisplayDateTime } from "@/lib/date-format";
import { roleLabel } from "@/lib/role-label";

export type AccountRow = {
  employeeId: string;
  name: string | null;
  isRegistered: boolean;
  email: string;
  organizationUnitName: string | null;
  role: UserRole;
  status: AccountStatus;
  lastLoginAt: Date | null;
};

const ROLE_FILTER_OPTIONS = [
  { value: "EMPLOYEE", label: "一般社員" },
  { value: "HR_SALES", label: "人事・営業" },
  { value: "MANAGER", label: "管理職" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "UNREGISTERED", label: "初回未登録" },
  { value: "ACTIVE", label: "在籍中" },
  { value: "RETIRED", label: "退職" },
];

type AccountTableProps = {
  accounts: AccountRow[];
  orgFilterOptions: { value: string; label: string }[];
};

// 0件時もヘッダは表示し続ける(列フィルタで0件になった場合に、ヘッダから
// フィルタを解除できる必要があるため)。
export function AccountTable({ accounts, orgFilterOptions }: AccountTableProps) {
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
              label="メールアドレス"
              sortKey="email"
              filter={{ type: "text", paramKey: "colEmail" }}
            />
            <DataTableHeaderCell
              label="所属組織"
              sortKey="org"
              filter={{ type: "enum", paramKey: "colOrg", options: orgFilterOptions }}
            />
            <DataTableHeaderCell
              label="権限"
              sortKey="role"
              filter={{ type: "enum", paramKey: "colRole", options: ROLE_FILTER_OPTIONS }}
            />
            <DataTableHeaderCell
              label="状態"
              sortKey="status"
              filter={{ type: "enum", paramKey: "colStatus", options: STATUS_FILTER_OPTIONS }}
            />
            <DataTableHeaderCell label="最終ログイン" sortKey="lastLogin" />
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {accounts.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-4 text-center text-zinc-500">
                該当するアカウントはありません。
              </td>
            </tr>
          ) : (
            accounts.map((account) => (
              <tr key={account.employeeId} className="border-b">
                <td className="p-2">
                  {/* (仮登録)の判定はis_registeredのみで行う。状態(退職が最優先)とは
                      独立のため、退職済み・未登録の社員にも付く(docs/screens.md account-new) */}
                  {employeeDisplayName(account.name, account.isRegistered) ?? "(未登録)"}
                </td>
                <td className="p-2">{account.email}</td>
                <td className="p-2">{account.organizationUnitName ?? "未所属"}</td>
                <td className="p-2">{roleLabel(account.role)}</td>
                <td className="p-2">{accountStatusLabel(account.status)}</td>
                <td className="p-2">{toDisplayDateTime(account.lastLoginAt) || "-"}</td>
                <td className="p-2">
                  <Link
                    href={`/accounts/${account.employeeId}`}
                    className="rounded border px-3 py-1"
                  >
                    編集
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
