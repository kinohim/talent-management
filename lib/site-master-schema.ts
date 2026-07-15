import { z } from "zod";

const siteNameSchema = z
  .string()
  .trim()
  .min(1, "現場名を入力してください。")
  .max(100, "現場名は100文字以内で入力してください。");

// 主管部署は任意(未選択は空文字=null)。実在チェックはaction側で行う
const organizationUnitIdSchema = z
  .string()
  .regex(/^\d*$/, "主管部署の指定が正しくありません。")
  .transform((value) => (value === "" ? null : Number(value)));

export type SiteMasterFormState = { error: string | null };

export type SiteMasterFormParseResult =
  | { success: true; siteName: string; organizationUnitId: number | null }
  | { success: false; error: string };

export function parseSiteMasterForm(formData: FormData): SiteMasterFormParseResult {
  const parsed = siteNameSchema.safeParse(formData.get("siteName"));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const orgParsed = organizationUnitIdSchema.safeParse(
    formData.get("organizationUnitId")?.toString() ?? "",
  );
  if (!orgParsed.success) {
    return { success: false, error: orgParsed.error.issues[0].message };
  }
  return {
    success: true,
    siteName: parsed.data,
    organizationUnitId: orgParsed.data,
  };
}
