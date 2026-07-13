import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountFilterForm } from "@/components/accounts/AccountFilterForm";
import { AccountTable, type AccountRow } from "@/components/accounts/AccountTable";
import { UserRole } from "@/generated/prisma/client";
import { deriveAccountStatus, parseAccountFilters } from "@/lib/account-list";
import { auth } from "@/lib/auth";
import { getOrganizationUnitOptions } from "@/lib/organization-unit";
import { buildOrganizationUnitTree, collectDescendantIds } from "@/lib/organization-unit-tree";
import { prisma } from "@/lib/prisma";

type AccountsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== UserRole.MANAGER) {
    // アカウント一覧は管理職専用(REF001参照)
    redirect("/");
  }

  const filters = parseAccountFilters(await searchParams);

  const units = await getOrganizationUnitOptions();
  const orgTree = buildOrganizationUnitTree(units);
  const orgUnitById = new Map(units.map((u) => [u.id, u]));

  const organizationUnitIdFilter =
    filters.organizationUnitIds.length > 0
      ? [...collectDescendantIds(units, filters.organizationUnitIds)]
      : null;

  const employees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      ...(filters.name ? { name: { contains: filters.name, mode: "insensitive" } } : {}),
      ...(organizationUnitIdFilter
        ? { organizationUnitId: { in: organizationUnitIdFilter } }
        : {}),
      ...(filters.roles.length > 0 ? { user: { role: { in: filters.roles } } } : {}),
    },
    include: { user: true },
    orderBy: [{ name: "asc" }, { employeeId: "asc" }],
  });

  const rows: AccountRow[] = employees
    .filter((employee) => employee.user)
    .map((employee) => ({
      employeeId: employee.employeeId,
      name: employee.name,
      organizationUnitName: employee.organizationUnitId
        ? (orgUnitById.get(employee.organizationUnitId)?.unitName ?? null)
        : null,
      role: employee.user!.role,
      status: deriveAccountStatus(employee),
      lastLoginAt: employee.user!.lastLoginAt,
    }))
    .filter((row) => filters.statuses.length === 0 || filters.statuses.includes(row.status));

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">アカウント一覧</h1>
        <Link
          href="/accounts/new"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          + 新規アカウント登録
        </Link>
      </div>

      <AccountFilterForm
        orgTree={orgTree}
        initialName={filters.name}
        initialOrgUnitIds={filters.organizationUnitIds}
        initialRoles={filters.roles}
        initialStatuses={filters.statuses}
      />

      <AccountTable accounts={rows} />
    </main>
  );
}
