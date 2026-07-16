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

// 氏名は任意(初回未登録のアカウントにのみ管理職が仮の氏名を登録できる)。
// 空文字はnull(未登録)として扱う。
const nameSchema = z
  .string()
  .trim()
  .max(50, "氏名は50文字以内で入力してください。")
  .transform((value) => (value === "" ? null : value));

function parseNameField(formData: FormData) {
  return nameSchema.safeParse(formData.get("name")?.toString() ?? "");
}

export type NewAccountFormState = { error: string | null };
export type EditAccountFormState = { error: string | null };

export type NewAccountFormInput = {
  employeeId: string;
  email: string;
  role: "EMPLOYEE" | "HR_SALES" | "MANAGER";
  name: string | null;
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

  const nameParsed = parseNameField(formData);
  if (!nameParsed.success) {
    return { success: false, error: nameParsed.error.issues[0].message };
  }

  return {
    success: true,
    data: {
      employeeId: employeeIdParsed.data,
      email: emailParsed.data,
      role: roleParsed.data,
      name: nameParsed.data,
    },
  };
}

export type EditAccountFormInput = {
  employeeId: string;
  email: string;
  role: "EMPLOYEE" | "HR_SALES" | "MANAGER";
  name: string | null;
};

export type EditAccountFormParseResult =
  | { success: true; data: EditAccountFormInput }
  | { success: false; error: string };

// account-editでは誤登録対策として社員ID・メールアドレスも変更可能(新規登録と同じ
// バリデーション)。メールはSSOログインの照合キーのため、UI側で警告+確認を挟む。
export function parseEditAccountForm(formData: FormData): EditAccountFormParseResult {
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

  const nameParsed = parseNameField(formData);
  if (!nameParsed.success) {
    return { success: false, error: nameParsed.error.issues[0].message };
  }

  return {
    success: true,
    data: {
      employeeId: employeeIdParsed.data,
      email: emailParsed.data,
      role: roleParsed.data,
      name: nameParsed.data,
    },
  };
}
