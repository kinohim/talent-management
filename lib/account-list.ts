import { EmploymentStatus, UserRole } from "@/generated/prisma/client";

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

export type AccountFilters = {
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

// REF007のフィルタをURLのsearchParamsからパースする純粋関数。
export function parseAccountFilters(searchParams: SearchParamsInput): AccountFilters {
  const name = (toArray(searchParams.name)[0] ?? "").trim();

  const organizationUnitIds = toArray(searchParams.orgUnitId)
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));

  const roles = toArray(searchParams.role).filter((v): v is UserRole =>
    VALID_ROLES.includes(v),
  );

  const statuses = toArray(searchParams.status).filter((v): v is AccountStatus =>
    VALID_STATUSES.includes(v),
  );

  return { name, organizationUnitIds, roles, statuses };
}
