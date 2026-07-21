export type ProfileCompletionInput = {
  name: string | null;
  nameKana: string | null;
  birthDate: Date | null;
  gender: string | null;
  nearestStationLine: string | null;
  nearestStationName: string | null;
  finalSchoolType: string | null;
  finalSchoolName: string | null;
  finalDepartmentName: string | null;
  graduationYearMonth: Date | null;
  graduationStatus: string | null;
  careerSummary: string | null;
  selfPr: string | null;
  skillCount: number;
  certificationCount: number;
};

export type ProfileCompletionResult = {
  filledCount: number;
  totalCount: number;
  // 0〜100(四捨五入)
  percent: number;
};

// mypageのEditableSectionに付与するDOM id(入力率バナーの「未入力項目を
// 入力する」ボタンのスクロール先)。表示順(基本情報→経歴概要・自己PR→
// スキル→資格)と一致させる。
export const PROFILE_SECTION_IDS = {
  basicInfo: "section-basic-info",
  careerSummary: "section-career-summary",
  skills: "section-skills",
  certifications: "section-certifications",
} as const;

function hasValue(value: string | null): boolean {
  return value != null && value.trim() !== "";
}

type SectionChecks = { id: string; checks: boolean[] };

// 入力率バナー(basic-info10項目+経歴概要・自己PR+スキル+資格=計14項目)の
// 判定を表示順のセクション単位で組み立てる。calculateProfileCompletion
// (全項目のフラットな充足率)とfirstIncompleteSectionId(セクション単位の
// 先頭未入力判定)の両方がこれを参照し、判定基準を単一箇所に保つ。
function buildSectionChecks(input: ProfileCompletionInput): SectionChecks[] {
  return [
    {
      id: PROFILE_SECTION_IDS.basicInfo,
      checks: [
        hasValue(input.name),
        hasValue(input.nameKana),
        input.birthDate != null,
        hasValue(input.gender),
        hasValue(input.nearestStationLine) || hasValue(input.nearestStationName),
        hasValue(input.finalSchoolType),
        hasValue(input.finalSchoolName),
        hasValue(input.finalDepartmentName),
        input.graduationYearMonth != null,
        hasValue(input.graduationStatus),
      ],
    },
    {
      id: PROFILE_SECTION_IDS.careerSummary,
      checks: [hasValue(input.careerSummary), hasValue(input.selfPr)],
    },
    { id: PROFILE_SECTION_IDS.skills, checks: [input.skillCount > 0] },
    { id: PROFILE_SECTION_IDS.certifications, checks: [input.certificationCount > 0] },
  ];
}

export function calculateProfileCompletion(
  input: ProfileCompletionInput,
): ProfileCompletionResult {
  const checks = buildSectionChecks(input).flatMap((section) => section.checks);
  const filledCount = checks.filter(Boolean).length;
  const totalCount = checks.length;
  const percent = Math.round((filledCount / totalCount) * 100);

  return { filledCount, totalCount, percent };
}

// 未入力項目が1つでもある最初のセクションのDOM idを返す(表示順で判定)。
// 全項目入力済みならnull。
export function firstIncompleteSectionId(
  input: ProfileCompletionInput,
): string | null {
  const section = buildSectionChecks(input).find((s) => s.checks.some((c) => !c));
  return section?.id ?? null;
}
