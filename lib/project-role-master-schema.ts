import { z } from "zod";

const projectRoleNameSchema = z
  .string()
  .trim()
  .min(1, "役割名を入力してください。")
  .max(20, "役割名は20文字以内で入力してください。");

export type ProjectRoleMasterFormState = { error: string | null };

export type ProjectRoleMasterFormParseResult =
  | { success: true; projectRoleName: string }
  | { success: false; error: string };

export function parseProjectRoleMasterForm(
  formData: FormData,
): ProjectRoleMasterFormParseResult {
  const parsed = projectRoleNameSchema.safeParse(formData.get("projectRoleName"));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  return { success: true, projectRoleName: parsed.data };
}
