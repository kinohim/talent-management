import { z } from "zod";

const certificationNameSchema = z
  .string()
  .trim()
  .min(1, "資格名を入力してください。")
  .max(100, "資格名は100文字以内で入力してください。");

const certificationOrganizationSchema = z
  .string()
  .trim()
  .min(1, "認定団体を入力してください。")
  .max(100, "認定団体は100文字以内で入力してください。");

const categoryNameSchema = z
  .string()
  .trim()
  .min(1, "カテゴリ名を入力してください。")
  .max(100, "カテゴリ名は100文字以内で入力してください。");

export type CertificationMasterFormState = { error: string | null };

export type CertificationCategoryInput =
  | { mode: "existing"; categoryId: number }
  | { mode: "new"; categoryName: string };

export type CertificationMasterFormInput = {
  category: CertificationCategoryInput;
  certificationName: string;
  certificationOrganization: string;
};

export type CertificationMasterFormParseResult =
  | { success: true; data: CertificationMasterFormInput }
  | { success: false; error: string };

// カテゴリの選択方式: categoryId="new"なら`newCategoryName`を新規カテゴリ名として
// 扱う(MST002「選択(既存)/新規入力」の入力形式。MST001のparseSkillMasterFormと
// 同型)。
export function parseCertificationMasterForm(
  formData: FormData,
): CertificationMasterFormParseResult {
  const categoryIdRaw = formData.get("categoryId");

  let category: CertificationCategoryInput;
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

  const certificationNameParsed = certificationNameSchema.safeParse(
    formData.get("certificationName"),
  );
  if (!certificationNameParsed.success) {
    return { success: false, error: certificationNameParsed.error.issues[0].message };
  }

  const certificationOrganizationParsed = certificationOrganizationSchema.safeParse(
    formData.get("certificationOrganization"),
  );
  if (!certificationOrganizationParsed.success) {
    return {
      success: false,
      error: certificationOrganizationParsed.error.issues[0].message,
    };
  }

  return {
    success: true,
    data: {
      category,
      certificationName: certificationNameParsed.data,
      certificationOrganization: certificationOrganizationParsed.data,
    },
  };
}
