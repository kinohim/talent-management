import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountFilterForm } from "@/components/accounts/AccountFilterForm";
import { AccountTable, type AccountRow } from "@/components/accounts/AccountTable";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { UserRole, type Prisma } from "@/generated/prisma/client";
import {
  ACCOUNT_SORT_KEYS,
  buildAccountOrderBy,
  buildAccountStatusWhere,
  deriveAccountStatus,
  parseAccountFilters,
} from "@/lib/account-list";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { clampPage, parsePagination, parseSort } from "@/lib/list-query";
import { getOrganizationUnitOptions } from "@/lib/organization-unit";
import {
  buildOrganizationUnitTree,
  resolveEffectiveOrgUnitIds,
} from "@/lib/organization-unit-tree";
import { prisma } from "@/lib/prisma";

type AccountsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  // 未登録の管理職はbasic-info(初回登録)へ誘導する(全認証必須ページ共通のガード)
  const destination = await resolveDestination(session.user);
  if (destination !== "/") {
    redirect(destination);
  }
  if (session.user.role !== UserRole.MANAGER) {
    // アカウント一覧は管理職専用(home参照)
    redirect("/");
  }

  const params = await searchParams;
  const filters = parseAccountFilters(params);
  const pagination = parsePagination(params);
  const { sortKey, order } = parseSort(params, ACCOUNT_SORT_KEYS);

  const units = await getOrganizationUnitOptions();
  const orgTree = buildOrganizationUnitTree(units);
  const orgUnitById = new Map(units.map((u) => [u.id, u]));

  // カスケード選択(上位+下位が両方選択されている場合は最深の選択配下のみ)
  const organizationUnitIdFilter =
    filters.organizationUnitIds.length > 0
      ? [...resolveEffectiveOrgUnitIds(units, filters.organizationUnitIds)]
      : null;

  const conditions: Prisma.EmployeeWhereInput[] = [
    { deletedAt: null },
    // アカウント一覧はuserを持つ社員のみが対象(取得後のJS filterではなく
    // where化する。ページング件数と整合させるため)
    { user: { isNot: null } },
  ];

  if (filters.name) {
    conditions.push({
      OR: [
        { name: { contains: filters.name, mode: "insensitive" } },
        { nameKana: { contains: filters.name, mode: "insensitive" } },
      ],
    });
  }
  if (organizationUnitIdFilter) {
    conditions.push({ organizationUnitId: { in: organizationUnitIdFilter } });
  }
  if (filters.roles.length > 0) {
    conditions.push({ user: { role: { in: filters.roles } } });
  }
  const statusWhere = buildAccountStatusWhere(filters.statuses);
  if (statusWhere) {
    conditions.push(statusWhere);
  }

  // --- 列フィルタ(ヘッダのポップオーバーからの絞込。検索フォームとAND合成) ---
  if (filters.colName) {
    conditions.push({ name: { contains: filters.colName, mode: "insensitive" } });
  }
  if (filters.colEmail) {
    conditions.push({
      user: { email: { contains: filters.colEmail, mode: "insensitive" } },
    });
  }
  if (filters.colOrganizationUnitIds.length > 0) {
    const numericIds = filters.colOrganizationUnitIds.filter(
      (v): v is number => v !== "none",
    );
    const orConditions: Prisma.EmployeeWhereInput[] = [];
    if (numericIds.length > 0) {
      orConditions.push({ organizationUnitId: { in: numericIds } });
    }
    if (filters.colOrganizationUnitIds.includes("none")) {
      orConditions.push({ organizationUnitId: null });
    }
    conditions.push({ OR: orConditions });
  }
  if (filters.colRoles.length > 0) {
    conditions.push({ user: { role: { in: filters.colRoles } } });
  }
  const colStatusWhere = buildAccountStatusWhere(filters.colStatuses);
  if (colStatusWhere) {
    conditions.push(colStatusWhere);
  }

  const where: Prisma.EmployeeWhereInput = { AND: conditions };

  const totalCount = await prisma.employee.count({ where });
  const { page, skip, pageCount } = clampPage(
    pagination.page,
    totalCount,
    pagination.pageSize,
  );

  const employees = await prisma.employee.findMany({
    where,
    include: { user: true },
    orderBy: buildAccountOrderBy(sortKey, order),
    skip,
    take: pagination.pageSize,
  });

  const rows: AccountRow[] = employees.map((employee) => ({
    employeeId: employee.employeeId,
    name: employee.name,
    email: employee.user?.email ?? "",
    organizationUnitName: employee.organizationUnitId
      ? (orgUnitById.get(employee.organizationUnitId)?.unitName ?? null)
      : null,
    role: employee.user!.role,
    status: deriveAccountStatus(employee),
    lastLoginAt: employee.user!.lastLoginAt,
  }));

  // 列フィルタ「所属組織」の選択肢。"none"=未所属
  const orgFilterOptions = [
    ...units.map((u) => ({ value: String(u.id), label: u.unitName })),
    { value: "none", label: "未所属" },
  ];

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">アカウント一覧</h1>
        <Link
          href="/accounts/new"
          className="rounded bg-zinc-900 hover:bg-zinc-700 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:hover:bg-zinc-300 dark:text-zinc-900"
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

      <div className="flex flex-col gap-2">
        <PaginationControls
          page={page}
          pageCount={pageCount}
          totalCount={totalCount}
          pageSize={pagination.pageSize}
        />
        <AccountTable accounts={rows} orgFilterOptions={orgFilterOptions} />
      </div>
    </main>
  );
}
