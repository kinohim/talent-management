import { z } from "zod";

const employeeIdSchema = z
  .string()
  .regex(/^\d{6}$/, "社員IDは6桁の数字で入力してください。");

const emailSchema = z
  .email("メールアドレスの形式が正しくありません。")
  .max(100, "メールアドレスは100文字以内で入力してください。");

const roleSchema = z.enum(["EMPLOYEE", "HR_SALES", "MANAGER"], {
  error: "権限を選択してください。",
});

export type NewAccountFormState = { error: string | null };
export type EditAccountFormState = { error: string | null };

export type NewAccountFormInput = {
  employeeId: string;
  email: string;
  role: "EMPLOYEE" | "HR_SALES" | "MANAGER";
};

export type NewAccountFormParseResult =
  | { success: true; data: NewAccountFormInput }
  | { success: false; error: string };

export function parseNewAccountForm(formData: FormData): NewAccountFormParseResult {
  const employeeIdParsed = employeeIdSchema.safeParse(formData.get("employeeId"));
  if (!employeeIdParsed.success) {
    return { success: false, error: employeeIdParsed.error.issues[0].message };
  }

  const emailParsed = emailSchema.safeParse(formData.get("email"));
  if (!emailParsed.success) {
    return { success: false, error: emailParsed.error.issues[0].message };
  }

  const roleParsed = roleSchema.safeParse(formData.get("role"));
  if (!roleParsed.success) {
    return { success: false, error: roleParsed.error.issues[0].message };
  }

  return {
    success: true,
    data: {
      employeeId: employeeIdParsed.data,
      email: emailParsed.data,
      role: roleParsed.data,
    },
  };
}

export type EditAccountFormParseResult =
  | { success: true; role: "EMPLOYEE" | "HR_SALES" | "MANAGER" }
  | { success: false; error: string };

export function parseEditAccountForm(formData: FormData): EditAccountFormParseResult {
  const roleParsed = roleSchema.safeParse(formData.get("role"));
  if (!roleParsed.success) {
    return { success: false, error: roleParsed.error.issues[0].message };
  }
  return { success: true, role: roleParsed.data };
}
