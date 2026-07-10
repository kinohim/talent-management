import { describe, expect, it } from "vitest";

import {
  buildProcessFlagLabels,
  formatSkillWithVersion,
  groupSkillsByCategory,
} from "./resume-view";

describe("groupSkillsByCategory", () => {
  it("0件なら空配列を返す", () => {
    expect(groupSkillsByCategory([])).toEqual([]);
  });

  it("連続する同カテゴリを1グループにまとめる", () => {
    const result = groupSkillsByCategory([
      {
        skill: { skillName: "TypeScript", skillCategory: { skillCategoryName: "言語" } },
        skillVersion: { versionName: "5.x" },
        skillLevel: "EXPERT",
      },
      {
        skill: { skillName: "Go", skillCategory: { skillCategoryName: "言語" } },
        skillVersion: null,
        skillLevel: "EXPERIENCED",
      },
    ]);
    expect(result).toEqual([
      {
        skillCategoryName: "言語",
        items: [
          { skillName: "TypeScript", versionName: "5.x", skillLevel: "EXPERT" },
          { skillName: "Go", versionName: null, skillLevel: "EXPERIENCED" },
        ],
      },
    ]);
  });

  it("カテゴリが切り替わったら新しいグループを作る", () => {
    const result = groupSkillsByCategory([
      {
        skill: { skillName: "TypeScript", skillCategory: { skillCategoryName: "言語" } },
        skillVersion: null,
        skillLevel: "EXPERT",
      },
      {
        skill: { skillName: "AWS", skillCategory: { skillCategoryName: "クラウド" } },
        skillVersion: null,
        skillLevel: "BASIC",
      },
    ]);
    expect(result.map((g) => g.skillCategoryName)).toEqual(["言語", "クラウド"]);
    expect(result[0].items).toHaveLength(1);
    expect(result[1].items).toHaveLength(1);
  });
});

describe("buildProcessFlagLabels", () => {
  it("nullなら空配列を返す", () => {
    expect(buildProcessFlagLabels(null)).toEqual([]);
    expect(buildProcessFlagLabels(undefined)).toEqual([]);
  });

  it("全てfalseなら空配列を返す", () => {
    expect(
      buildProcessFlagLabels({
        researchAnalysis: false,
        requirementsDefinition: false,
        basicDesign: false,
        detailedDesign: false,
        development: false,
        testing: false,
        operation: false,
      }),
    ).toEqual([]);
  });

  it("trueの項目だけを順序通りラベル化する", () => {
    expect(
      buildProcessFlagLabels({
        researchAnalysis: false,
        requirementsDefinition: true,
        basicDesign: true,
        detailedDesign: false,
        development: null,
        testing: true,
        operation: false,
      }),
    ).toEqual(["要件定義", "基本設計", "テスト"]);
  });
});

describe("formatSkillWithVersion", () => {
  it("バージョンがなければスキル名のみ", () => {
    expect(formatSkillWithVersion("Go", null)).toBe("Go");
  });

  it("バージョンがあれば括弧で連結する", () => {
    expect(formatSkillWithVersion("TypeScript", "5.x")).toBe("TypeScript(5.x)");
  });
});
