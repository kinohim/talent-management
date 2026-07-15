import type { Prisma } from "@/generated/prisma/client";

export type MatchMode = "AND" | "OR";

// テーブルヘッダの列フィルタ(検索フォームとは独立にAND合成される絞込)。
// colOrganizationUnitIds の "none" は「未所属」を表す。
// スキル・資格の列フィルタは検索フォームと同じ仕様(マスタ複数選択+AND/OR)。
export type ResumeColumnFilters = {
  colName: string;
  colOrganizationUnitIds: (number | "none")[];
  colExperienceMin: number | null;
  colExperienceMax: number | null;
  colSkillIds: number[];
  colSkillMatchMode: MatchMode;
  colCertificationIds: number[];
  colCertificationMatchMode: MatchMode;
};

export type ResumeSearchFilters = ResumeColumnFilters & {
  name: string;
  organizationUnitIds: number[];
  experienceMin: number | null;
  experienceMax: number | null;
  skillIds: number[];
  skillMatchMode: MatchMode;
  certificationIds: number[];
  certificationMatchMode: MatchMode;
  // 携わったプロジェクト(現場)。単一選択のみ
  siteId: number | null;
  includeRetired: boolean;
};

type SearchParamsInput = Record<string, string | string[] | undefined>;

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function toIdArray(value: string | string[] | undefined): number[] {
  return toArray(value)
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));
}

function parseMatchMode(value: string | string[] | undefined): MatchMode {
  const raw = toArray(value)[0];
  return raw === "AND" ? "AND" : "OR";
}

// 0〜99にクランプする(範囲外の入力を弾いて検索不能にするのではなく、
// 意図に近い値へ丸める)。
function clampExperience(value: number): number {
  return Math.min(99, Math.max(0, value));
}

function parseExperienceBound(value: string | string[] | undefined): number | null {
  const raw = toArray(value)[0];
  if (raw === undefined || raw === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n)) return null;
  return clampExperience(n);
}

// 列フィルタの所属組織は数値id or "none"(未所属)を受け付ける。
function parseColumnOrgUnitIds(
  value: string | string[] | undefined,
): (number | "none")[] {
  return toArray(value)
    .map((v) => (v === "none" ? ("none" as const) : Number(v)))
    .filter((v): v is number | "none" => v === "none" || Number.isInteger(v));
}

// REF002のフィルタをURLのsearchParamsからパースする純粋関数。
export function parseResumeSearchFilters(searchParams: SearchParamsInput): ResumeSearchFilters {
  const name = (toArray(searchParams.name)[0] ?? "").trim();
  const organizationUnitIds = toIdArray(searchParams.orgUnitId);

  let experienceMin = parseExperienceBound(searchParams.experienceMin);
  let experienceMax = parseExperienceBound(searchParams.experienceMax);
  if (experienceMin != null && experienceMax != null && experienceMin > experienceMax) {
    [experienceMin, experienceMax] = [experienceMax, experienceMin];
  }

  let colExperienceMin = parseExperienceBound(searchParams.colExpMin);
  let colExperienceMax = parseExperienceBound(searchParams.colExpMax);
  if (
    colExperienceMin != null &&
    colExperienceMax != null &&
    colExperienceMin > colExperienceMax
  ) {
    [colExperienceMin, colExperienceMax] = [colExperienceMax, colExperienceMin];
  }

  return {
    name,
    organizationUnitIds,
    experienceMin,
    experienceMax,
    skillIds: toIdArray(searchParams.skillId),
    skillMatchMode: parseMatchMode(searchParams.skillMode),
    certificationIds: toIdArray(searchParams.certificationId),
    certificationMatchMode: parseMatchMode(searchParams.certificationMode),
    siteId: toIdArray(searchParams.siteId)[0] ?? null,
    includeRetired: toArray(searchParams.includeRetired)[0] === "true",
    colName: (toArray(searchParams.colName)[0] ?? "").trim(),
    colOrganizationUnitIds: parseColumnOrgUnitIds(searchParams.colOrg),
    colExperienceMin,
    colExperienceMax,
    colSkillIds: toIdArray(searchParams.colSkillId),
    colSkillMatchMode: parseMatchMode(searchParams.colSkillMode),
    colCertificationIds: toIdArray(searchParams.colCertificationId),
    colCertificationMatchMode: parseMatchMode(searchParams.colCertificationMode),
  };
}

export const RESUME_SORT_KEYS = ["name", "org", "experience"] as const;
export type ResumeSortKey = (typeof RESUME_SORT_KEYS)[number];

// ヘッダソート用のorderByビルダー。ページングの安定性のため、常に
// employeeIdのタイブレークを末尾に付ける。氏名ソートはカナを第一キーにする。
export function buildResumeOrderBy(
  sortKey: ResumeSortKey | null,
  order: "asc" | "desc",
): Prisma.EmployeeOrderByWithRelationInput[] {
  switch (sortKey) {
    case "name":
      return [
        { nameKana: { sort: order, nulls: "last" } },
        { name: order },
        { employeeId: "asc" },
      ];
    case "org":
      return [
        { organizationUnit: { unitName: order } },
        { employeeId: "asc" },
      ];
    case "experience":
      return [
        { experienceMonths: { sort: order, nulls: "last" } },
        { employeeId: "asc" },
      ];
    default:
      return [{ name: "asc" }, { employeeId: "asc" }];
  }
}
