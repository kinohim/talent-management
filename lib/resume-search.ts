export type MatchMode = "AND" | "OR";

export type ResumeSearchFilters = {
  name: string;
  organizationUnitIds: number[];
  experienceMin: number | null;
  experienceMax: number | null;
  skillIds: number[];
  skillMatchMode: MatchMode;
  certificationIds: number[];
  certificationMatchMode: MatchMode;
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

// REF002のフィルタをURLのsearchParamsからパースする純粋関数。
export function parseResumeSearchFilters(searchParams: SearchParamsInput): ResumeSearchFilters {
  const name = (toArray(searchParams.name)[0] ?? "").trim();
  const organizationUnitIds = toIdArray(searchParams.orgUnitId);

  let experienceMin = parseExperienceBound(searchParams.experienceMin);
  let experienceMax = parseExperienceBound(searchParams.experienceMax);
  if (experienceMin != null && experienceMax != null && experienceMin > experienceMax) {
    [experienceMin, experienceMax] = [experienceMax, experienceMin];
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
    includeRetired: toArray(searchParams.includeRetired)[0] === "true",
  };
}
