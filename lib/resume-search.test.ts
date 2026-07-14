import { describe, expect, it } from "vitest";

import { buildResumeOrderBy, parseResumeSearchFilters } from "./resume-search";

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
      siteId: null,
      includeRetired: false,
      colName: "",
      colOrganizationUnitIds: [],
      colExperienceMin: null,
      colExperienceMax: null,
      colSkillIds: [],
      colSkillMatchMode: "OR",
      colCertificationIds: [],
      colCertificationMatchMode: "OR",
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

  it("現場idは単一選択(先頭のみ採用、不正値はnull)", () => {
    expect(parseResumeSearchFilters({ siteId: "30" }).siteId).toBe(30);
    expect(parseResumeSearchFilters({ siteId: ["30", "31"] }).siteId).toBe(30);
    expect(parseResumeSearchFilters({ siteId: "abc" }).siteId).toBeNull();
    expect(parseResumeSearchFilters({}).siteId).toBeNull();
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

  it("列フィルタのテキストはtrimされる", () => {
    expect(parseResumeSearchFilters({ colName: " 田中 " }).colName).toBe("田中");
  });

  it("列フィルタのスキル・資格はid複数+AND/ORをパースする(検索フォームと同仕様)", () => {
    const filters = parseResumeSearchFilters({
      colSkillId: ["1", "2", "x"],
      colSkillMode: "AND",
      colCertificationId: "5",
      colCertificationMode: "invalid",
    });
    expect(filters.colSkillIds).toEqual([1, 2]);
    expect(filters.colSkillMatchMode).toBe("AND");
    expect(filters.colCertificationIds).toEqual([5]);
    expect(filters.colCertificationMatchMode).toBe("OR");
  });

  it("列フィルタの所属組織は数値idと\"none\"(未所属)を受け付ける", () => {
    const filters = parseResumeSearchFilters({ colOrg: ["1", "none", "abc"] });
    expect(filters.colOrganizationUnitIds).toEqual([1, "none"]);
  });

  it("列フィルタの経験年数もクランプ・下限>上限の入れ替えを行う", () => {
    const filters = parseResumeSearchFilters({ colExpMin: "50", colExpMax: "3" });
    expect(filters.colExperienceMin).toBe(3);
    expect(filters.colExperienceMax).toBe(50);
    expect(parseResumeSearchFilters({ colExpMin: "-1" }).colExperienceMin).toBe(0);
  });
});

describe("buildResumeOrderBy", () => {
  it("null(デフォルト)は氏名昇順+employeeIdタイブレーク", () => {
    expect(buildResumeOrderBy(null, "desc")).toEqual([
      { name: "asc" },
      { employeeId: "asc" },
    ]);
  });

  it("nameはカナ→氏名の順でソートしnullsは末尾", () => {
    expect(buildResumeOrderBy("name", "desc")).toEqual([
      { nameKana: { sort: "desc", nulls: "last" } },
      { name: "desc" },
      { employeeId: "asc" },
    ]);
  });

  it("orgは組織名でソートする", () => {
    expect(buildResumeOrderBy("org", "asc")).toEqual([
      { organizationUnit: { unitName: "asc" } },
      { employeeId: "asc" },
    ]);
  });

  it("experienceは経験年数でソートしnullsは末尾", () => {
    expect(buildResumeOrderBy("experience", "asc")).toEqual([
      { experienceYears: { sort: "asc", nulls: "last" } },
      { employeeId: "asc" },
    ]);
  });
});
