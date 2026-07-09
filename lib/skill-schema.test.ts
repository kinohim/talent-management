import { describe, expect, it } from "vitest";

import { findDuplicateRowKey, parseSkillRowsForm } from "./skill-schema";

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

describe("parseSkillRowsForm", () => {
  it("行が0件でも成功する(全スキル削除を許容)", () => {
    const result = parseSkillRowsForm(formData({}));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.rows).toEqual([]);
    }
  });

  it("バージョンなしの1行が成功する", () => {
    const result = parseSkillRowsForm(
      formData({
        "items.0.skillCategoryId": "1",
        "items.0.skillId": "2",
        "items.0.skillLevel": "EXPERIENCED",
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.rows).toEqual([
        {
          skillCategoryId: "1",
          skillId: "2",
          skillVersionId: undefined,
          skillLevel: "EXPERIENCED",
        },
      ]);
    }
  });

  it("indexが欠番(0と2)でも両方の行を復元する", () => {
    const result = parseSkillRowsForm(
      formData({
        "items.0.skillCategoryId": "1",
        "items.0.skillId": "2",
        "items.0.skillLevel": "EXPERIENCED",
        "items.2.skillCategoryId": "1",
        "items.2.skillId": "3",
        "items.2.skillLevel": "BASIC",
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.rows).toHaveLength(2);
    }
  });

  it("必須項目が欠けている行はrowErrorsを返す", () => {
    const result = parseSkillRowsForm(
      formData({
        "items.0.skillCategoryId": "1",
        "items.0.skillLevel": "EXPERIENCED",
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.rowErrors[0]?.skillId).toBe("スキル名を選択してください。");
    }
  });

  it("同一スキル+同一バージョン(なし)の重複行はformErrorを返す", () => {
    const result = parseSkillRowsForm(
      formData({
        "items.0.skillCategoryId": "1",
        "items.0.skillId": "2",
        "items.0.skillLevel": "EXPERIENCED",
        "items.1.skillCategoryId": "1",
        "items.1.skillId": "2",
        "items.1.skillLevel": "BASIC",
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.formError).toBe(
        "同じスキル(バージョン含む)が複数行に登録されています。",
      );
    }
  });

  it("同一スキルでもバージョンが異なれば重複扱いしない", () => {
    const result = parseSkillRowsForm(
      formData({
        "items.0.skillCategoryId": "1",
        "items.0.skillId": "2",
        "items.0.skillVersionId": "10",
        "items.0.skillLevel": "EXPERIENCED",
        "items.1.skillCategoryId": "1",
        "items.1.skillId": "2",
        "items.1.skillVersionId": "11",
        "items.1.skillLevel": "BASIC",
      }),
    );
    expect(result.success).toBe(true);
  });
});

describe("findDuplicateRowKey", () => {
  it("重複がなければnullを返す", () => {
    const key = findDuplicateRowKey([
      { skillCategoryId: "1", skillId: "1", skillVersionId: undefined, skillLevel: "BASIC" },
      { skillCategoryId: "1", skillId: "2", skillVersionId: undefined, skillLevel: "BASIC" },
    ]);
    expect(key).toBeNull();
  });
});
