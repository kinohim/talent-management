import { describe, expect, it } from "vitest";

import { parseResumeSearchFilters } from "./resume-search";

describe("parseResumeSearchFilters", () => {
  it("空のsearchParamsは全項目デフォルト値になる", () => {
    expect(parseResumeSearchFilters({})).toEqual({
      name: "",
      organizationUnitIds: [],
      experienceMin: null,
      experienceMax: null,
      skillIds: [],
      skillMatchMode: "OR",
      certificationIds: [],
      certificationMatchMode: "OR",
      includeRetired: false,
    });
  });

  it("氏名は前後空白をtrimする", () => {
    expect(parseResumeSearchFilters({ name: "  山田  " }).name).toBe("山田");
  });

  it("所属組織id・スキルid・資格idは複数値を数値配列にパースする", () => {
    const filters = parseResumeSearchFilters({
      orgUnitId: ["1", "2"],
      skillId: ["10"],
      certificationId: ["20", "21"],
    });
    expect(filters.organizationUnitIds).toEqual([1, 2]);
    expect(filters.skillIds).toEqual([10]);
    expect(filters.certificationIds).toEqual([20, 21]);
  });

  it("AND/ORモードはAND以外なら常にORにフォールバックする", () => {
    expect(parseResumeSearchFilters({ skillMode: "AND" }).skillMatchMode).toBe("AND");
    expect(parseResumeSearchFilters({ skillMode: "invalid" }).skillMatchMode).toBe("OR");
    expect(parseResumeSearchFilters({}).certificationMatchMode).toBe("OR");
  });

  it("経験年数は0〜99にクランプする", () => {
    expect(parseResumeSearchFilters({ experienceMin: "-5" }).experienceMin).toBe(0);
    expect(parseResumeSearchFilters({ experienceMax: "150" }).experienceMax).toBe(99);
  });

  it("下限>上限なら入れ替える", () => {
    const filters = parseResumeSearchFilters({ experienceMin: "10", experienceMax: "3" });
    expect(filters.experienceMin).toBe(3);
    expect(filters.experienceMax).toBe(10);
  });

  it("includeRetiredは文字列\"true\"のときのみtrueになる", () => {
    expect(parseResumeSearchFilters({ includeRetired: "true" }).includeRetired).toBe(true);
    expect(parseResumeSearchFilters({ includeRetired: "false" }).includeRetired).toBe(false);
    expect(parseResumeSearchFilters({}).includeRetired).toBe(false);
  });
});
