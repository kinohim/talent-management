import { z } from "zod";

const siteNameSchema = z
  .string()
  .trim()
  .min(1, "現場名を入力してください。")
  .max(100, "現場名は100文字以内で入力してください。");

export type SiteMasterFormState = { error: string | null };

export type SiteMasterFormParseResult =
  | { success: true; siteName: string }
  | { success: false; error: string };

export function parseSiteMasterForm(formData: FormData): SiteMasterFormParseResult {
  const parsed = siteNameSchema.safeParse(formData.get("siteName"));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  return { success: true, siteName: parsed.data };
}
