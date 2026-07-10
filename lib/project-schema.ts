import { z } from "zod";

const YEAR_MONTH_PATTERN = /^\d{4}-\d{2}$/;

export const PROCESS_FLAG_KEYS = [
  "researchAnalysis",
  "requirementsDefinition",
  "basicDesign",
  "detailedDesign",
  "development",
  "testing",
  "operation",
] as const;
export type ProcessFlagKey = (typeof PROCESS_FLAG_KEYS)[number];

export const PROCESS_FLAG_LABELS: Record<ProcessFlagKey, string> = {
  researchAnalysis: "調査分析",
  requirementsDefinition: "要件定義",
  basicDesign: "基本設計",
  detailedDesign: "詳細設計",
  development: "製造",
  testing: "テスト",
  operation: "運用",
};

const projectFormSchema = z
  .object({
    siteId: z.string().regex(/^\d+$/, "現場名を選択してください。"),
    projectTitle: z
      .string()
      .trim()
      .min(1, "プロジェクトタイトルを入力してください。")
      .max(100, "プロジェクトタイトルは100文字以内で入力してください。"),
    industry: z
      .string()
      .trim()
      .max(100, "業種は100文字以内で入力してください。")
      .optional(),
    startYearMonth: z
      .string()
      .regex(YEAR_MONTH_PATTERN, "開始年月を入力してください。"),
    isOngoing: z.boolean(),
    endYearMonth: z
      .string()
      .regex(YEAR_MONTH_PATTERN, "終了年月の形式が正しくありません。")
      .optional(),
    projectSummary: z
      .string()
      .trim()
      .max(300, "プロジェクト概要は300文字以内で入力してください。")
      .optional(),
    roleIds: z
      .array(z.string().regex(/^\d+$/))
      .min(1, "役割を1つ以上選択してください。"),
    totalTeamSize: z
      .string()
      .trim()
      .max(20, "規模(全体人数)は20文字以内で入力してください。")
      .optional(),
    teamSize: z
      .string()
      .trim()
      .max(20, "規模(チーム人数)は20文字以内で入力してください。")
      .optional(),
    detailOverview: z
      .string()
      .trim()
      .max(300, "業務詳細は300文字以内で入力してください。")
      .optional(),
    researchAnalysis: z.boolean(),
    requirementsDefinition: z.boolean(),
    basicDesign: z.boolean(),
    detailedDesign: z.boolean(),
    development: z.boolean(),
    testing: z.boolean(),
    operation: z.boolean(),
  })
  .check((ctx) => {
    const { isOngoing, startYearMonth, endYearMonth } = ctx.value;
    if (isOngoing || !endYearMonth) return;
    if (
      !YEAR_MONTH_PATTERN.test(startYearMonth) ||
      !YEAR_MONTH_PATTERN.test(endYearMonth)
    ) {
      return;
    }
    // "YYYY-MM"はゼロ埋め固定長のため文字列比較で年月の前後判定ができる。
    if (endYearMonth < startYearMonth) {
      ctx.issues.push({
        code: "custom",
        message: "終了年月は開始年月以降の年月を入力してください。",
        path: ["endYearMonth"],
        input: ctx.value,
      });
    }
  });

export type ProjectFormFields = z.infer<typeof projectFormSchema>;
export type ProjectFormFieldErrors = Partial<Record<keyof ProjectFormFields, string>>;

export type ProjectSkillRowInput = {
  skillCategoryId: string;
  skillId: string;
  skillVersionId?: string;
};
export type ProjectSkillRowFieldErrors = Partial<
  Record<keyof ProjectSkillRowInput, string>
>;

export type ProjectFormInput = ProjectFormFields & {
  skills: ProjectSkillRowInput[];
};

export type ProjectFormParseResult =
  | { success: true; data: ProjectFormInput }
  | {
      success: false;
      fieldErrors: ProjectFormFieldErrors;
      skillRowErrors: Record<number, ProjectSkillRowFieldErrors>;
      formError: string | null;
    };

function readField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

const projectSkillRowSchema = z.object({
  skillCategoryId: z.string().regex(/^\d+$/, "カテゴリを選択してください。"),
  skillId: z.string().regex(/^\d+$/, "スキル名を選択してください。"),
  skillVersionId: z
    .string()
    .regex(/^\d+$/, "バージョンの形式が不正です。")
    .optional(),
});

const SKILL_ROW_KEY_PATTERN =
  /^skills\.(\d+)\.(skillCategoryId|skillId|skillVersionId)$/;

// ProjectFormのスキルタグ部分は`skills.<index>.<field>`という名前でFormDataに
// 乗る。行の追加・削除でindexが欠番になっても動作するようMapで集約する。
function collectSkillRows(formData: FormData): Map<number, Record<string, string>> {
  const rows = new Map<number, Record<string, string>>();
  for (const [key, value] of formData.entries()) {
    const match = SKILL_ROW_KEY_PATTERN.exec(key);
    if (!match || typeof value !== "string") continue;
    const index = Number(match[1]);
    const field = match[2];
    const row = rows.get(index) ?? {};
    row[field] = value;
    rows.set(index, row);
  }
  return rows;
}

// project_skillの複合ユニーク制約(project_id + skill_id + skill_version_id)に
// 合わせ、同一スキル+同一バージョン(なしはundefined同士)の重複行を検出する。
export function findDuplicateProjectSkillRowKey(
  rows: ProjectSkillRowInput[],
): string | null {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = `${row.skillId}:${row.skillVersionId ?? ""}`;
    if (seen.has(key)) return key;
    seen.add(key);
  }
  return null;
}

function flattenFieldErrors(
  error: z.ZodError<ProjectFormFields>,
): ProjectFormFieldErrors {
  const flat = error.flatten().fieldErrors;
  const result: ProjectFormFieldErrors = {};
  for (const key of Object.keys(flat) as (keyof ProjectFormFields)[]) {
    const messages = flat[key];
    if (messages?.[0]) result[key] = messages[0];
  }
  return result;
}

export function parseProjectForm(formData: FormData): ProjectFormParseResult {
  const roleIds = formData
    .getAll("roleIds")
    .filter((value): value is string => typeof value === "string");

  const processFlag = (key: ProcessFlagKey) => formData.get(key) === "on";

  const parsed = projectFormSchema.safeParse({
    siteId: readField(formData, "siteId") ?? "",
    projectTitle: readField(formData, "projectTitle") ?? "",
    industry: readField(formData, "industry"),
    startYearMonth: readField(formData, "startYearMonth") ?? "",
    isOngoing: formData.get("isOngoing") === "on",
    endYearMonth: readField(formData, "endYearMonth"),
    projectSummary: readField(formData, "projectSummary"),
    roleIds,
    totalTeamSize: readField(formData, "totalTeamSize"),
    teamSize: readField(formData, "teamSize"),
    detailOverview: readField(formData, "detailOverview"),
    researchAnalysis: processFlag("researchAnalysis"),
    requirementsDefinition: processFlag("requirementsDefinition"),
    basicDesign: processFlag("basicDesign"),
    detailedDesign: processFlag("detailedDesign"),
    development: processFlag("development"),
    testing: processFlag("testing"),
    operation: processFlag("operation"),
  });

  const rowsMap = collectSkillRows(formData);
  const indices = [...rowsMap.keys()].sort((a, b) => a - b);
  const skillRowErrors: Record<number, ProjectSkillRowFieldErrors> = {};
  const skillRows: ProjectSkillRowInput[] = [];

  for (const index of indices) {
    const raw = rowsMap.get(index) ?? {};
    const rowParsed = projectSkillRowSchema.safeParse({
      skillCategoryId: raw.skillCategoryId ?? "",
      skillId: raw.skillId ?? "",
      skillVersionId: raw.skillVersionId || undefined,
    });
    if (!rowParsed.success) {
      const flat = rowParsed.error.flatten().fieldErrors;
      const rowErrors: ProjectSkillRowFieldErrors = {};
      for (const key of Object.keys(flat) as (keyof ProjectSkillRowInput)[]) {
        const messages = flat[key];
        if (messages?.[0]) rowErrors[key] = messages[0];
      }
      skillRowErrors[index] = rowErrors;
      continue;
    }
    skillRows.push(rowParsed.data);
  }

  if (!parsed.success || Object.keys(skillRowErrors).length > 0) {
    return {
      success: false,
      fieldErrors: parsed.success ? {} : flattenFieldErrors(parsed.error),
      skillRowErrors,
      formError: null,
    };
  }

  if (findDuplicateProjectSkillRowKey(skillRows)) {
    return {
      success: false,
      fieldErrors: {},
      skillRowErrors: {},
      formError: "同じスキル(バージョン含む)が複数行に登録されています。",
    };
  }

  return { success: true, data: { ...parsed.data, skills: skillRows } };
}
