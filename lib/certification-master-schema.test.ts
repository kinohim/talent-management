import { describe, expect, it } from "vitest";

import { parseCategoryNameForm, parseCertificationMasterForm } from "./certification-master-schema";

function formDataWith(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("parseCertificationMasterForm", () => {
  it("既存カテゴリ選択+資格名+認定団体で成功する", () => {
    const result = parseCertificationMasterForm(
      formDataWith({
        categoryId: "1",
        certificationName: "基本情報技術者試験",
        certificationOrganization: "IPA",
      }),
    );
    expect(result).toEqual({
      success: true,
      data: {
        category: { mode: "existing", categoryId: 1 },
        certificationName: "基本情報技術者試験",
        certificationOrganization: "IPA",
      },
    });
  });

  it("新規カテゴリ入力で成功する", () => {
    const result = parseCertificationMasterForm(
      formDataWith({
        categoryId: "new",
        newCategoryName: "語学系",
        certificationName: "TOEIC",
        certificationOrganization: "国際ビジネスコミュニケーション協会",
      }),
    );
    expect(result).toEqual({
      success: true,
      data: {
        category: { mode: "new", categoryName: "語学系" },
        certificationName: "TOEIC",
        certificationOrganization: "国際ビジネスコミュニケーション協会",
      },
    });
  });

  it("categoryId未指定はエラー", () => {
    const result = parseCertificationMasterForm(
      formDataWith({ certificationName: "TOEIC", certificationOrganization: "IIBC" }),
    );
    expect(result).toEqual({ success: false, error: "カテゴリを選択してください。" });
  });

  it("新規カテゴリ名が空ならエラー", () => {
    const result = parseCertificationMasterForm(
      formDataWith({
        categoryId: "new",
        newCategoryName: "",
        certificationName: "TOEIC",
        certificationOrganization: "IIBC",
      }),
    );
    expect(result.success).toBe(false);
  });

  it("資格名が空ならエラー", () => {
    const result = parseCertificationMasterForm(
      formDataWith({ categoryId: "1", certificationName: "", certificationOrganization: "IIBC" }),
    );
    expect(result.success).toBe(false);
  });

  it("資格名が101文字ならエラー", () => {
    const result = parseCertificationMasterForm(
      formDataWith({
        categoryId: "1",
        certificationName: "あ".repeat(101),
        certificationOrganization: "IIBC",
      }),
    );
    expect(result.success).toBe(false);
  });

  it("認定団体が空ならエラー", () => {
    const result = parseCertificationMasterForm(
      formDataWith({ categoryId: "1", certificationName: "TOEIC", certificationOrganization: "" }),
    );
    expect(result.success).toBe(false);
  });

  it("認定団体が101文字ならエラー", () => {
    const result = parseCertificationMasterForm(
      formDataWith({
        categoryId: "1",
        certificationName: "TOEIC",
        certificationOrganization: "あ".repeat(101),
      }),
    );
    expect(result.success).toBe(false);
  });
});

describe("parseCategoryNameForm", () => {
  it("カテゴリ名をtrimして返す", () => {
    const result = parseCategoryNameForm(formDataWith({ categoryName: " 国家資格 " }));
    expect(result).toEqual({ success: true, data: "国家資格" });
  });

  it("空文字はエラー", () => {
    const result = parseCategoryNameForm(formDataWith({ categoryName: "  " }));
    expect(result.success).toBe(false);
  });

  it("101文字はエラー", () => {
    const result = parseCategoryNameForm(
      formDataWith({ categoryName: "あ".repeat(101) }),
    );
    expect(result.success).toBe(false);
  });
});
