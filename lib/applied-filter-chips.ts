import type { AccountFilters } from "@/lib/account-list";
import type { ResumeSearchFilters } from "@/lib/resume-search";

export type AppliedFilterChip = {
  id: string;
  label: string;
  // 解除時に削除するURLSearchParamsのキー(+複数値パラメータの場合はvalueで
  // その値だけを取り除く。valueを省略するとキーごと削除する)
  remove: { key: string; value?: string }[];
};

type ResumeChipLookups = {
  orgUnitName: (id: number) => string | undefined;
  skillName: (id: number) => string | undefined;
  certificationName: (id: number) => string | undefined;
  siteName: (id: number) => string | undefined;
};

export const RESUME_APPLIED_FILTER_CLEAR_KEYS = [
  "name",
  "orgUnitId",
  "experienceMin",
  "experienceMax",
  "skillId",
  "skillMode",
  "certificationId",
  "certificationMode",
  "siteId",
  "includeRetired",
];

// resume-listの検索フォーム条件(列フィルタ除く)から、適用中条件チップを組み立てる。
export function buildResumeAppliedFilterChips(
  filters: ResumeSearchFilters,
  lookups: ResumeChipLookups,
): AppliedFilterChip[] {
  const chips: AppliedFilterChip[] = [];

  if (filters.name) {
    chips.push({
      id: "name",
      label: `氏名カナ: ${filters.name}`,
      remove: [{ key: "name" }],
    });
  }

  if (filters.experienceMin != null || filters.experienceMax != null) {
    const label =
      filters.experienceMin != null && filters.experienceMax != null
        ? `経験年数 ${filters.experienceMin}〜${filters.experienceMax}年`
        : filters.experienceMin != null
          ? `経験年数 ${filters.experienceMin}年以上`
          : `経験年数 ${filters.experienceMax}年以下`;
    chips.push({
      id: "experience",
      label,
      remove: [{ key: "experienceMin" }, { key: "experienceMax" }],
    });
  }

  for (const id of filters.organizationUnitIds) {
    chips.push({
      id: `org-${id}`,
      label: `所属組織: ${lookups.orgUnitName(id) ?? id}`,
      remove: [{ key: "orgUnitId", value: String(id) }],
    });
  }

  for (const id of filters.skillIds) {
    chips.push({
      id: `skill-${id}`,
      label: `スキル: ${lookups.skillName(id) ?? id}`,
      remove: [{ key: "skillId", value: String(id) }],
    });
  }

  for (const id of filters.certificationIds) {
    chips.push({
      id: `certification-${id}`,
      label: `資格: ${lookups.certificationName(id) ?? id}`,
      remove: [{ key: "certificationId", value: String(id) }],
    });
  }

  if (filters.siteId != null) {
    chips.push({
      id: "site",
      label: `現場: ${lookups.siteName(filters.siteId) ?? filters.siteId}`,
      remove: [{ key: "siteId" }],
    });
  }

  if (filters.includeRetired) {
    chips.push({
      id: "includeRetired",
      label: "退職者を含める",
      remove: [{ key: "includeRetired" }],
    });
  }

  return chips;
}

type AccountChipLookups = {
  orgUnitName: (id: number) => string | undefined;
  roleLabel: (role: AccountFilters["roles"][number]) => string;
  statusLabel: (status: AccountFilters["statuses"][number]) => string;
};

export const ACCOUNT_APPLIED_FILTER_CLEAR_KEYS = ["name", "orgUnitId", "role", "status"];

// account-listの検索フォーム条件(列フィルタ除く)から、適用中条件チップを組み立てる。
export function buildAccountAppliedFilterChips(
  filters: AccountFilters,
  lookups: AccountChipLookups,
): AppliedFilterChip[] {
  const chips: AppliedFilterChip[] = [];

  if (filters.name) {
    chips.push({
      id: "name",
      label: `氏名カナ: ${filters.name}`,
      remove: [{ key: "name" }],
    });
  }

  for (const id of filters.organizationUnitIds) {
    chips.push({
      id: `org-${id}`,
      label: `所属組織: ${lookups.orgUnitName(id) ?? id}`,
      remove: [{ key: "orgUnitId", value: String(id) }],
    });
  }

  for (const role of filters.roles) {
    chips.push({
      id: `role-${role}`,
      label: `権限: ${lookups.roleLabel(role)}`,
      remove: [{ key: "role", value: role }],
    });
  }

  for (const status of filters.statuses) {
    chips.push({
      id: `status-${status}`,
      label: `状態: ${lookups.statusLabel(status)}`,
      remove: [{ key: "status", value: status }],
    });
  }

  return chips;
}
