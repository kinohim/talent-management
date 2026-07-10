import { describe, expect, it } from "vitest";

import type { ProjectOptions } from "./project-options";
import {
  validateProjectFormAgainstMaster,
  validateProjectSkillsAgainstMaster,
} from "./project-options";
import type { SkillOptions } from "./skill-options";

const options: ProjectOptions = {
  sites: [{ id: 1, siteName: "A社基幹システム更改" }],
  roles: [
    { id: 10, projectRoleName: "SE" },
    { id: 11, projectRoleName: "PG" },
  ],
};

describe("validateProjectFormAgainstMaster", () => {
  it("マスタに整合する値はnullを返す", () => {
    expect(
      validateProjectFormAgainstMaster(
        { siteId: "1", roleIds: ["10", "11"] },
        options,
      ),
    ).toBeNull();
  });

  it("存在しない現場IDは弾く", () => {
    expect(
      validateProjectFormAgainstMaster({ siteId: "999", roleIds: ["10"] }, options),
    ).toBe("選択された現場が見つかりません。");
  });

  it("存在しない役割IDは弾く", () => {
    expect(
      validateProjectFormAgainstMaster({ siteId: "1", roleIds: ["999"] }, options),
    ).toBe("選択された役割が見つかりません。");
  });
});

const skillOptions: SkillOptions = {
  categories: [{ id: 1, skillCategoryName: "プログラミング言語" }],
  skills: [
    { id: 10, skillCategoryId: 1, skillName: "Java", hasVersion: true },
    { id: 11, skillCategoryId: 1, skillName: "Python", hasVersion: false },
  ],
  versions: [{ id: 100, skillId: 10, versionName: "17", isActive: true }],
};

describe("validateProjectSkillsAgainstMaster", () => {
  it("マスタに整合する行はnullを返す", () => {
    expect(
      validateProjectSkillsAgainstMaster(
        [{ skillCategoryId: "1", skillId: "11", skillVersionId: undefined }],
        skillOptions,
      ),
    ).toBeNull();
  });

  it("存在しないカテゴリIDは弾く", () => {
    expect(
      validateProjectSkillsAgainstMaster(
        [{ skillCategoryId: "999", skillId: "11", skillVersionId: undefined }],
        skillOptions,
      ),
    ).toBe("選択されたカテゴリが見つかりません。");
  });

  it("存在しないスキルIDは弾く", () => {
    expect(
      validateProjectSkillsAgainstMaster(
        [{ skillCategoryId: "1", skillId: "999", skillVersionId: undefined }],
        skillOptions,
      ),
    ).toBe("選択されたスキルが見つかりません。");
  });

  it("カテゴリとスキルの親子関係が一致しなければ弾く", () => {
    const mismatched: SkillOptions = {
      ...skillOptions,
      categories: [...skillOptions.categories, { id: 2, skillCategoryName: "その他" }],
    };
    expect(
      validateProjectSkillsAgainstMaster(
        [{ skillCategoryId: "2", skillId: "11", skillVersionId: undefined }],
        mismatched,
      ),
    ).toBe("選択されたスキルが見つかりません。");
  });

  it("hasVersion=trueのスキルでバージョン未選択は弾く", () => {
    expect(
      validateProjectSkillsAgainstMaster(
        [{ skillCategoryId: "1", skillId: "10", skillVersionId: undefined }],
        skillOptions,
      ),
    ).toBe("「Java」はバージョンの選択が必須です。");
  });

  it("hasVersion=falseのスキルでバージョンを選択していれば弾く", () => {
    expect(
      validateProjectSkillsAgainstMaster(
        [{ skillCategoryId: "1", skillId: "11", skillVersionId: "100" }],
        skillOptions,
      ),
    ).toBe("「Python」はバージョン管理対象外です。");
  });
});
