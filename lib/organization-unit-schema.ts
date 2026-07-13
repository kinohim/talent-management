import { z } from "zod";

const unitNameSchema = z
  .string()
  .trim()
  .min(1, "名称を入力してください。")
  .max(100, "名称は100文字以内で入力してください。");

export type OrganizationUnitFormState = { error: string | null };

export type UnitNameParseResult =
  | { success: true; unitName: string }
  | { success: false; error: string };

export function parseUnitNameForm(formData: FormData): UnitNameParseResult {
  const parsed = unitNameSchema.safeParse(formData.get("unitName"));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  return { success: true, unitName: parsed.data };
}
