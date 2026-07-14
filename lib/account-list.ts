import { EmploymentStatus, UserRole } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

export type AccountStatus = "UNREGISTERED" | "ACTIVE" | "RETIRED";

const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  UNREGISTERED: "初回未登録",
  ACTIVE: "在籍中",
  RETIRED: "退職",
};

// REF007の状態判定(docs/screens.md「状態の判定」参照)。3条件は文字通りには
// 排他的でないため、退職を最優先とする(退職済みなら未登録有無を問わず「退職」)。
export function deriveAccountStatus(employee: {
  isRegistered: boolean;
  employmentStatus: EmploymentStatus;
}): AccountStatus {
  if (employee.employmentStatus === EmploymentStatus.RETIRED) return "RETIRED";
  if (!employee.isRegistered) return "UNREGISTERED";
  return "ACTIVE";
}

export function accountStatusLabel(status: AccountStatus): string {
  return ACCOUNT_STATUS_LABELS[status];
}

// テーブルヘッダの列フィルタ(検索フォームとは独立にAND合成される絞込)。
export type AccountColumnFilters = {
  colName: string;
  colEmail: string;
  colOrganizationUnitIds: (number | "none")[];
  colRoles: UserRole[];
  colStatuses: AccountStatus[];
};

export type AccountFilters = AccountColumnFilters & {
  name: string;
  organizationUnitIds: number[];
  roles: UserRole[];
  statuses: AccountStatus[];
};

type SearchParamsInput = Record<string, string | string[] | undefined>;

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

const VALID_ROLES: readonly string[] = Object.values(UserRole);
const VALID_STATUSES: readonly string[] = ["UNREGISTERED", "ACTIVE", "RETIRED"];

function parseRoles(value: string | string[] | undefined): UserRole[] {
  return toArray(value).filter((v): v is UserRole => VALID_ROLES.includes(v));
}

function parseStatuses(value: string | string[] | undefined): AccountStatus[] {
  return toArray(value).filter((v): v is AccountStatus =>
    VALID_STATUSES.includes(v),
  );
}

function parseColumnOrgUnitIds(
  value: string | string[] | undefined,
): (number | "none")[] {
  return toArray(value)
    .map((v) => (v === "none" ? ("none" as const) : Number(v)))
    .filter((v): v is number | "none" => v === "none" || Number.isInteger(v));
}

// REF007のフィルタをURLのsearchParamsからパースする純粋関数。
export function parseAccountFilters(searchParams: SearchParamsInput): AccountFilters {
  const name = (toArray(searchParams.name)[0] ?? "").trim();

  const organizationUnitIds = toArray(searchParams.orgUnitId)
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));

  return {
    name,
    organizationUnitIds,
    roles: parseRoles(searchParams.role),
    statuses: parseStatuses(searchParams.status),
    colName: (toArray(searchParams.colName)[0] ?? "").trim(),
    colEmail: (toArray(searchParams.colEmail)[0] ?? "").trim(),
    colOrganizationUnitIds: parseColumnOrgUnitIds(searchParams.colOrg),
    colRoles: parseRoles(searchParams.colRole),
    colStatuses: parseStatuses(searchParams.colStatus),
  };
}

// 状態フィルタのDB where化。deriveAccountStatusと同じ判定
// (退職最優先→初回未登録→在籍中)をemploymentStatus×isRegisteredで表現する。
// ページングをDB側で行うため、取得後のJS filterではなくwhereで絞る必要がある。
export function buildAccountStatusWhere(
  statuses: AccountStatus[],
): Prisma.EmployeeWhereInput | null {
  if (statuses.length === 0) return null;
  const conditions: Prisma.EmployeeWhereInput[] = statuses.map((status) => {
    switch (status) {
      case "RETIRED":
        return { employmentStatus: EmploymentStatus.RETIRED };
      case "UNREGISTERED":
        return {
          employmentStatus: EmploymentStatus.ACTIVE,
          isRegistered: false,
        };
      case "ACTIVE":
        return {
          employmentStatus: EmploymentStatus.ACTIVE,
          isRegistered: true,
        };
    }
  });
  return conditions.length === 1 ? conditions[0] : { OR: conditions };
}

export const ACCOUNT_SORT_KEYS = [
  "name",
  "email",
  "org",
  "role",
  "status",
  "lastLogin",
] as const;
export type AccountSortKey = (typeof ACCOUNT_SORT_KEYS)[number];

// ヘッダソート用のorderByビルダー。ページングの安定性のため、常に
// employeeIdのタイブレークを末尾に付ける。statusのソートはenum定義順
// (ACTIVE→RETIRED)+isRegisteredの組で、deriveAccountStatusの3状態が
// 「在籍中系→退職」の順に並ぶことを意図している。
export function buildAccountOrderBy(
  sortKey: AccountSortKey | null,
  order: "asc" | "desc",
): Prisma.EmployeeOrderByWithRelationInput[] {
  switch (sortKey) {
    case "name":
      return [
        { name: { sort: order, nulls: "last" } },
        { employeeId: "asc" },
      ];
    case "email":
      return [{ user: { email: order } }, { employeeId: "asc" }];
    case "org":
      return [
        { organizationUnit: { unitName: order } },
        { employeeId: "asc" },
      ];
    case "role":
      return [{ user: { role: order } }, { employeeId: "asc" }];
    case "status":
      return [
        { employmentStatus: order },
        { isRegistered: order },
        { employeeId: "asc" },
      ];
    case "lastLogin":
      return [{ user: { lastLoginAt: order } }, { employeeId: "asc" }];
    default:
      return [
        { name: { sort: "asc", nulls: "last" } },
        { employeeId: "asc" },
      ];
  }
}
