import Link from "next/link";

import type { UserRole } from "@/generated/prisma/client";
import { accountStatusLabel, type AccountStatus } from "@/lib/account-list";
import { toDisplayDateTime } from "@/lib/date-format";
import { roleLabel } from "@/lib/role-label";

export type AccountRow = {
  employeeId: string;
  name: string | null;
  organizationUnitName: string | null;
  role: UserRole;
  status: AccountStatus;
  lastLoginAt: Date | null;
};

export function AccountTable({ accounts }: { accounts: AccountRow[] }) {
  if (accounts.length === 0) {
    return <p className="text-sm text-zinc-500">該当するアカウントはありません。</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">氏名</th>
            <th className="p-2">所属組織</th>
            <th className="p-2">権限</th>
            <th className="p-2">状態</th>
            <th className="p-2">最終ログイン</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.employeeId} className="border-b">
              <td className="p-2">{account.name ?? "(未登録)"}</td>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
