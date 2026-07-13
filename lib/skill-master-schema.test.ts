import { describe, expect, it } from "vitest";

import { parseSkillMasterForm } from "./skill-master-schema";

function formDataWith(fields: Record<string, string | string[]>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      for (const v of value) formData.append(key, v);
    } else {
      formData.set(key, value);
    }
  }
  return formData;
}

describe("parseSkillMasterForm", () => {
  it("既存カテゴリ選択+スキル名のみで成功する", () => {
    const result = parseSkillMasterForm(
      formDataWith({ categoryId: "1", skillName: "Java" }),
    );
    expect(result).toEqual({
      success: true,
      data: {
        category: { mode: "existing", categoryId: 1 },
        skillName: "Java",
        versionNames: [],
      },
    });
  });

  it("新規カテゴリ入力で成功する", () => {
    const result = parseSkillMasterForm(
      formDataWith({
        categoryId: "new",
        newCategoryName: "クラウド",
        skillName: "AWS",
      }),
    );
    expect(result).toEqual({
      success: true,
      data: {
        category: { mode: "new", categoryName: "クラウド" },
        skillName: "AWS",
        versionNames: [],
      },
    });
  });

  it("バージョン名は重複除去・前後空白trim・空文字除外する", () => {
    const result = parseSkillMasterForm(
      formDataWith({
        categoryId: "1",
        skillName: "Java",
        versionNames: ["8", " 11 ", "", "8", "17"],
      }),
    );
    expect(result).toEqual({
      success: true,
      data: {
        category: { mode: "existing", categoryId: 1 },
        skillName: "Java",
        versionNames: ["8", "11", "17"],
      },
    });
  });

  it("categoryId未指定はエラー", () => {
    const result = parseSkillMasterForm(formDataWith({ skillName: "Java" }));
    expect(result).toEqual({ success: false, error: "カテゴリを選択してください。" });
  });

  it("新規カテゴリ名が空ならエラー", () => {
    const result = parseSkillMasterForm(
      formDataWith({ categoryId: "new", newCategoryName: "", skillName: "Java" }),
    );
    expect(result.success).toBe(false);
  });

  it("スキル名が空ならエラー", () => {
    const result = parseSkillMasterForm(
      formDataWith({ categoryId: "1", skillName: "" }),
    );
    expect(result.success).toBe(false);
  });

  it("スキル名が101文字ならエラー", () => {
    const result = parseSkillMasterForm(
      formDataWith({ categoryId: "1", skillName: "あ".repeat(101) }),
    );
    expect(result.success).toBe(false);
  });

  it("バージョン名が51文字ならエラー", () => {
    const result = parseSkillMasterForm(
      formDataWith({
        categoryId: "1",
        skillName: "Java",
        versionNames: ["1".repeat(51)],
      }),
    );
    expect(result.success).toBe(false);
  });
});
