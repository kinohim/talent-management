import { describe, expect, it } from "vitest";

import {
  PROFILE_SECTION_IDS,
  calculateProfileCompletion,
  firstIncompleteSectionId,
  type ProfileCompletionInput,
} from "@/lib/profile-completion";

const EMPTY: ProfileCompletionInput = {
  name: null,
  nameKana: null,
  birthDate: null,
  gender: null,
  nearestStationLine: null,
  nearestStationName: null,
  finalSchoolType: null,
  finalSchoolName: null,
  finalDepartmentName: null,
  graduationYearMonth: null,
  graduationStatus: null,
  careerSummary: null,
  selfPr: null,
  skillCount: 0,
  certificationCount: 0,
};

const FULL: ProfileCompletionInput = {
  name: "管理職 太郎",
  nameKana: "カンリショク タロウ",
  birthDate: new Date("1990-01-01"),
  gender: "MALE",
  nearestStationLine: "山手線",
  nearestStationName: "渋谷",
  finalSchoolType: "UNIVERSITY",
  finalSchoolName: "○○大学",
  finalDepartmentName: "情報工学科",
  graduationYearMonth: new Date("2012-03-01"),
  graduationStatus: "GRADUATED",
  careerSummary: "経歴概要のテキスト",
  selfPr: "自己PRのテキスト",
  skillCount: 3,
  certificationCount: 1,
};

describe("calculateProfileCompletion", () => {
  it("全項目未入力なら0%", () => {
    expect(calculateProfileCompletion(EMPTY)).toEqual({
      filledCount: 0,
      totalCount: 14,
      percent: 0,
    });
  });

  it("全項目入力済みなら100%", () => {
    expect(calculateProfileCompletion(FULL)).toEqual({
      filledCount: 14,
      totalCount: 14,
      percent: 100,
    });
  });

  it("空文字・空白のみの値は未入力扱い", () => {
    const result = calculateProfileCompletion({
      ...EMPTY,
      name: "",
      nameKana: "   ",
    });
    expect(result.filledCount).toBe(0);
  });

  it("最寄駅は路線名・駅名のどちらか一方だけでも1項目扱いになる", () => {
    const lineOnly = calculateProfileCompletion({ ...EMPTY, nearestStationLine: "山手線" });
    const nameOnly = calculateProfileCompletion({ ...EMPTY, nearestStationName: "渋谷" });
    expect(lineOnly.filledCount).toBe(1);
    expect(nameOnly.filledCount).toBe(1);
  });

  it("スキル・資格は件数0を未入力、1件以上を入力済みとして扱う", () => {
    const withSkillOnly = calculateProfileCompletion({ ...EMPTY, skillCount: 1 });
    const withCertificationOnly = calculateProfileCompletion({
      ...EMPTY,
      certificationCount: 2,
    });
    expect(withSkillOnly.filledCount).toBe(1);
    expect(withCertificationOnly.filledCount).toBe(1);
  });

  it("パーセントは四捨五入する(14項目中1件=約7%)", () => {
    const result = calculateProfileCompletion({ ...EMPTY, name: "太郎" });
    expect(result.percent).toBe(7);
  });

  it("14項目中7件入力なら50%", () => {
    const result = calculateProfileCompletion({
      ...EMPTY,
      name: "太郎",
      nameKana: "タロウ",
      birthDate: new Date("1990-01-01"),
      gender: "MALE",
      nearestStationLine: "山手線",
      finalSchoolType: "UNIVERSITY",
      finalSchoolName: "○○大学",
    });
    expect(result.percent).toBe(50);
  });
});

describe("firstIncompleteSectionId", () => {
  it("全項目入力済みならnullを返す", () => {
    expect(firstIncompleteSectionId(FULL)).toBeNull();
  });

  it("基本情報が未入力なら基本情報セクションを返す(表示順で最優先)", () => {
    expect(firstIncompleteSectionId(EMPTY)).toBe(PROFILE_SECTION_IDS.basicInfo);
  });

  it("基本情報のみ完了なら経歴概要・自己PRセクションを返す", () => {
    const result = firstIncompleteSectionId({
      ...FULL,
      careerSummary: null,
      selfPr: "自己PR",
      skillCount: 0,
      certificationCount: 0,
    });
    expect(result).toBe(PROFILE_SECTION_IDS.careerSummary);
  });

  it("基本情報・経歴概要/自己PRが完了ならスキルセクションを返す", () => {
    const result = firstIncompleteSectionId({ ...FULL, skillCount: 0, certificationCount: 0 });
    expect(result).toBe(PROFILE_SECTION_IDS.skills);
  });

  it("スキルまで完了していれば資格セクションを返す", () => {
    const result = firstIncompleteSectionId({ ...FULL, certificationCount: 0 });
    expect(result).toBe(PROFILE_SECTION_IDS.certifications);
  });
});
