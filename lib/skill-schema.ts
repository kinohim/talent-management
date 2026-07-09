import { z } from "zod";

const skillRowSchema = z.object({
  skillCategoryId: z.string().regex(/^\d+$/, "カテゴリを選択してください。"),
  skillId: z.string().regex(/^\d+$/, "スキル名を選択してください。"),
  skillVersionId: z.string().regex(/^\d+$/, "バージョンの形式が不正です。").optional(),
  skillLevel: z.enum(["EXPERT", "EXPERIENCED", "BASIC"], {
    error: "習熟度を選択してください。",
  }),
});

export type SkillRowInput = z.infer<typeof skillRowSchema>;
export type SkillRowFieldErrors = Partial<Record<keyof SkillRowInput, string>>;

export type SkillFormParseResult =
  | { success: true; rows: SkillRowInput[] }
  | {
      success: false;
      rowErrors: Record<number, SkillRowFieldErrors>;
      formError: string | null;
    };

const ROW_KEY_PATTERN =
  /^items\.(\d+)\.(skillCategoryId|skillId|skillVersionId|skillLevel)$/;

// SkillRowsFormは行を`items.<index>.<field>`という名前でFormDataに乗せる。
// 行の追加・削除でindexが欠番になっても(例: 0, 2)動作するようMapで集約する。
function collectRows(formData: FormData): Map<number, Record<string, string>> {
  const rows = new Map<number, Record<string, string>>();
  for (const [key, value] of formData.entries()) {
    const match = ROW_KEY_PATTERN.exec(key);
    if (!match || typeof value !== "string") continue;
    const index = Number(match[1]);
    const field = match[2];
    const row = rows.get(index) ?? {};
    row[field] = value;
    rows.set(index, row);
  }
  return rows;
}

function flattenRowFieldErrors(error: z.ZodError<SkillRowInput>): SkillRowFieldErrors {
  const flat = error.flatten().fieldErrors;
  const result: SkillRowFieldErrors = {};
  for (const key of Object.keys(flat) as (keyof SkillRowInput)[]) {
    const messages = flat[key];
    if (messages?.[0]) result[key] = messages[0];
  }
  return result;
}

// 同一スキル+同一バージョン(バージョンなしはundefined同士)の重複行を検出する。
// 同一スキルでもバージョンが異なれば重複扱いしない(docs/decisions.md「スキルの
// バージョンは複数同時登録可能」参照)。
export function findDuplicateRowKey(rows: SkillRowInput[]): string | null {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = `${row.skillId}:${row.skillVersionId ?? ""}`;
    if (seen.has(key)) return key;
    seen.add(key);
  }
  return null;
}

export function parseSkillRowsForm(formData: FormData): SkillFormParseResult {
  const rowsMap = collectRows(formData);
  const indices = [...rowsMap.keys()].sort((a, b) => a - b);

  const rowErrors: Record<number, SkillRowFieldErrors> = {};
  const rows: SkillRowInput[] = [];

  for (const index of indices) {
    const raw = rowsMap.get(index) ?? {};
    const parsed = skillRowSchema.safeParse({
      skillCategoryId: raw.skillCategoryId ?? "",
      skillId: raw.skillId ?? "",
      skillVersionId: raw.skillVersionId || undefined,
      skillLevel: raw.skillLevel ?? "",
    });
    if (!parsed.success) {
      rowErrors[index] = flattenRowFieldErrors(parsed.error);
      continue;
    }
    rows.push(parsed.data);
  }

  if (Object.keys(rowErrors).length > 0) {
    return { success: false, rowErrors, formError: null };
  }

  if (findDuplicateRowKey(rows)) {
    return {
      success: false,
      rowErrors: {},
      formError: "同じスキル(バージョン含む)が複数行に登録されています。",
    };
  }

  return { success: true, rows };
}
