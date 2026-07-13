import { z } from "zod";

const skillNameSchema = z
  .string()
  .trim()
  .min(1, "スキル名を入力してください。")
  .max(100, "スキル名は100文字以内で入力してください。");

const categoryNameSchema = z
  .string()
  .trim()
  .min(1, "カテゴリ名を入力してください。")
  .max(100, "カテゴリ名は100文字以内で入力してください。");

const versionNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(50, "バージョン名は50文字以内で入力してください。");

export type SkillMasterFormState = { error: string | null };

export type SkillCategoryInput =
  | { mode: "existing"; categoryId: number }
  | { mode: "new"; categoryName: string };

export type SkillMasterFormInput = {
  category: SkillCategoryInput;
  skillName: string;
  versionNames: string[];
};

export type SkillMasterFormParseResult =
  | { success: true; data: SkillMasterFormInput }
  | { success: false; error: string };

// カテゴリの選択方式: categoryId="new"なら`newCategoryName`を新規カテゴリ名として
// 扱う(MST001「選択(既存)/新規入力」の入力形式)。バージョンは同名`versionNames`の
// 複数inputから`FormData.getAll`で回収する方式(タグ入力UI側の実装に依存しない)。
export function parseSkillMasterForm(formData: FormData): SkillMasterFormParseResult {
  const categoryIdRaw = formData.get("categoryId");

  let category: SkillCategoryInput;
  if (categoryIdRaw === "new") {
    const parsed = categoryNameSchema.safeParse(formData.get("newCategoryName"));
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    category = { mode: "new", categoryName: parsed.data };
  } else {
    const idNum = typeof categoryIdRaw === "string" ? Number(categoryIdRaw) : NaN;
    if (!categoryIdRaw || Number.isNaN(idNum)) {
      return { success: false, error: "カテゴリを選択してください。" };
    }
    category = { mode: "existing", categoryId: idNum };
  }

  const skillNameParsed = skillNameSchema.safeParse(formData.get("skillName"));
  if (!skillNameParsed.success) {
    return { success: false, error: skillNameParsed.error.issues[0].message };
  }

  const versionNames: string[] = [];
  const seen = new Set<string>();
  for (const raw of formData.getAll("versionNames")) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const parsed = versionNameSchema.safeParse(trimmed);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    if (seen.has(parsed.data)) continue;
    seen.add(parsed.data);
    versionNames.push(parsed.data);
  }

  return {
    success: true,
    data: { category, skillName: skillNameParsed.data, versionNames },
  };
}
