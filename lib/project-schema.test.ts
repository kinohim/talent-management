import { describe, expect, it } from "vitest";

import {
  findDuplicateProjectSkillRowKey,
  parseProjectForm,
} from "./project-schema";

function baseFields(): Record<string, string> {
  return {
    siteId: "1",
    projectTitle: "基幹系刷新プロジェクト",
    startYearMonth: "2020-01",
    "roleIds": "10",
  };
}

function formData(
  entries: Record<string, string | string[]>,
): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (Array.isArray(value)) {
      for (const v of value) fd.append(key, v);
    } else {
      fd.set(key, value);
    }
  }
  return fd;
}

describe("parseProjectForm", () => {
  it("必須項目が揃っていれば成功する(役割1つ・スキル0件)", () => {
    const result = parseProjectForm(formData(baseFields()));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.siteId).toBe("1");
      expect(result.data.roleIds).toEqual(["10"]);
      expect(result.data.skills).toEqual([]);
      expect(result.data.isOngoing).toBe(false);
    }
  });

  it("役割が0件ならエラーになる", () => {
    const fd = formData(baseFields());
    fd.delete("roleIds");
    const result = parseProjectForm(fd);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.roleIds).toBe("役割を1つ以上選択してください。");
    }
  });

  it("役割は複数選択できる", () => {
    const result = parseProjectForm(
      formData({ ...baseFields(), roleIds: ["10", "11"] }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roleIds).toEqual(["10", "11"]);
    }
  });

  it("現在チェック時は終了年月のバリデーションを行わない", () => {
    const result = parseProjectForm(
      formData({ ...baseFields(), isOngoing: "on" }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isOngoing).toBe(true);
    }
  });

  it("終了年月が開始年月より前ならエラーになる", () => {
    const result = parseProjectForm(
      formData({
        ...baseFields(),
        startYearMonth: "2020-06",
        endYearMonth: "2020-01",
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.endYearMonth).toBe(
        "終了年月は開始年月以降の年月を入力してください。",
      );
    }
  });

  it("終了年月が開始年月以降なら成功する", () => {
    const result = parseProjectForm(
      formData({
        ...baseFields(),
        startYearMonth: "2020-01",
        endYearMonth: "2020-06",
      }),
    );
    expect(result.success).toBe(true);
  });

  it("担当工程のチェックボックスが正しく反映される", () => {
    const result = parseProjectForm(
      formData({
        ...baseFields(),
        basicDesign: "on",
        testing: "on",
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.basicDesign).toBe(true);
      expect(result.data.testing).toBe(true);
      expect(result.data.development).toBe(false);
    }
  });

  it("スキル行(バージョンなし)を1件パースできる", () => {
    const result = parseProjectForm(
      formData({
        ...baseFields(),
        "skills.0.skillCategoryId": "1",
        "skills.0.skillId": "5",
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skills).toEqual([
        { skillCategoryId: "1", skillId: "5", skillVersionId: undefined },
      ]);
    }
  });

  it("スキル行のカテゴリ未選択はrowErrorsを返す", () => {
    const result = parseProjectForm(
      formData({
        ...baseFields(),
        "skills.0.skillId": "5",
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.skillRowErrors[0]?.skillCategoryId).toBe(
        "カテゴリを選択してください。",
      );
    }
  });

  it("同一スキル+同一バージョンの重複行はformErrorを返す", () => {
    const result = parseProjectForm(
      formData({
        ...baseFields(),
        "skills.0.skillCategoryId": "1",
        "skills.0.skillId": "5",
        "skills.1.skillCategoryId": "1",
        "skills.1.skillId": "5",
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.formError).toBe(
        "同じスキル(バージョン含む)が複数行に登録されています。",
      );
    }
  });

  it("プロジェクトタイトル未入力はエラーになる", () => {
    const fd = formData(baseFields());
    fd.delete("projectTitle");
    const result = parseProjectForm(fd);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.projectTitle).toBe(
        "プロジェクトタイトルを入力してください。",
      );
    }
  });
});

describe("findDuplicateProjectSkillRowKey", () => {
  it("重複がなければnullを返す", () => {
    const key = findDuplicateProjectSkillRowKey([
      { skillCategoryId: "1", skillId: "1", skillVersionId: undefined },
      { skillCategoryId: "1", skillId: "2", skillVersionId: undefined },
    ]);
    expect(key).toBeNull();
  });

  it("同一スキルでもバージョンが異なれば重複扱いしない", () => {
    const key = findDuplicateProjectSkillRowKey([
      { skillCategoryId: "1", skillId: "1", skillVersionId: "10" },
      { skillCategoryId: "1", skillId: "1", skillVersionId: "11" },
    ]);
    expect(key).toBeNull();
  });
});
