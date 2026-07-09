import { describe, expect, it } from "vitest";

import type { SkillOptions } from "./skill-options";
import { validateSkillRowsAgainstMaster } from "./skill-options";
import type { SkillRowInput } from "./skill-schema";

const options: SkillOptions = {
  categories: [{ id: 1, skillCategoryName: "プログラミング言語" }],
  skills: [
    { id: 10, skillCategoryId: 1, skillName: "Java", hasVersion: true },
    { id: 11, skillCategoryId: 1, skillName: "Python", hasVersion: false },
  ],
  versions: [{ id: 100, skillId: 10, versionName: "17", isActive: true }],
};

function row(overrides: Partial<SkillRowInput>): SkillRowInput {
  return {
    skillCategoryId: "1",
    skillId: "11",
    skillVersionId: undefined,
    skillLevel: "BASIC",
    ...overrides,
  };
}

describe("validateSkillRowsAgainstMaster", () => {
  it("マスタに整合する行はnullを返す", () => {
    expect(validateSkillRowsAgainstMaster([row({})], options)).toBeNull();
  });

  it("hasVersionのスキルにバージョンを選択していれば成功する", () => {
    const result = validateSkillRowsAgainstMaster(
      [row({ skillId: "10", skillVersionId: "100" })],
      options,
    );
    expect(result).toBeNull();
  });

  it("存在しないカテゴリIDは弾く", () => {
    const result = validateSkillRowsAgainstMaster(
      [row({ skillCategoryId: "999" })],
      options,
    );
    expect(result).toBe("選択されたカテゴリが見つかりません。");
  });

  it("カテゴリとスキルの親子関係が一致しなければ弾く", () => {
    const mismatched: SkillOptions = {
      ...options,
      categories: [...options.categories, { id: 2, skillCategoryName: "その他" }],
    };
    const result = validateSkillRowsAgainstMaster(
      [row({ skillCategoryId: "2", skillId: "11" })],
      mismatched,
    );
    expect(result).toBe("選択されたスキルが見つかりません。");
  });

  it("hasVersion=trueのスキルでバージョン未選択は弾く", () => {
    const result = validateSkillRowsAgainstMaster(
      [row({ skillId: "10" })],
      options,
    );
    expect(result).toBe("「Java」はバージョンの選択が必須です。");
  });

  it("hasVersion=falseのスキルでバージョンを選択していれば弾く", () => {
    const result = validateSkillRowsAgainstMaster(
      [row({ skillId: "11", skillVersionId: "100" })],
      options,
    );
    expect(result).toBe("「Python」はバージョン管理対象外です。");
  });

  it("バージョンが別スキルのものなら弾く", () => {
    const otherVersions: SkillOptions = {
      ...options,
      skills: [...options.skills, { id: 12, skillCategoryId: 1, skillName: "Go", hasVersion: true }],
    };
    const result = validateSkillRowsAgainstMaster(
      [row({ skillId: "12", skillVersionId: "100" })],
      otherVersions,
    );
    expect(result).toBe("選択されたバージョンが見つかりません。");
  });
});
