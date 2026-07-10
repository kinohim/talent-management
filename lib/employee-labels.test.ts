import { describe, expect, it } from "vitest";

import {
  FinalSchoolType,
  Gender,
  GraduationStatus,
  SkillLevel,
} from "@/generated/prisma/client";

import {
  finalSchoolTypeLabel,
  genderLabel,
  graduationStatusLabel,
  skillLevelLabel,
} from "./employee-labels";

describe("genderLabel", () => {
  it("nullなら空文字を返す", () => {
    expect(genderLabel(null)).toBe("");
  });

  it("全ての値をラベルに変換する", () => {
    expect(genderLabel(Gender.MALE)).toBe("男性");
    expect(genderLabel(Gender.FEMALE)).toBe("女性");
    expect(genderLabel(Gender.OTHER)).toBe("その他");
  });
});

describe("finalSchoolTypeLabel", () => {
  it("nullなら空文字を返す", () => {
    expect(finalSchoolTypeLabel(null)).toBe("");
  });

  it("全ての値をラベルに変換する", () => {
    expect(finalSchoolTypeLabel(FinalSchoolType.HIGH_SCHOOL)).toBe("高校");
    expect(finalSchoolTypeLabel(FinalSchoolType.VOCATIONAL_SCHOOL)).toBe(
      "専門学校",
    );
    expect(finalSchoolTypeLabel(FinalSchoolType.JUNIOR_COLLEGE)).toBe("短大");
    expect(finalSchoolTypeLabel(FinalSchoolType.UNIVERSITY)).toBe("大学");
    expect(finalSchoolTypeLabel(FinalSchoolType.GRADUATE_SCHOOL)).toBe(
      "大学院",
    );
  });
});

describe("graduationStatusLabel", () => {
  it("nullなら空文字を返す", () => {
    expect(graduationStatusLabel(null)).toBe("");
  });

  it("全ての値をラベルに変換する", () => {
    expect(graduationStatusLabel(GraduationStatus.GRADUATED)).toBe("卒業");
    expect(graduationStatusLabel(GraduationStatus.WITHDRAWN)).toBe("中退");
  });
});

describe("skillLevelLabel", () => {
  it("全ての値をラベルに変換する", () => {
    expect(skillLevelLabel(SkillLevel.EXPERT)).toBe("◎ 得意");
    expect(skillLevelLabel(SkillLevel.EXPERIENCED)).toBe("○ 経験あり");
    expect(skillLevelLabel(SkillLevel.BASIC)).toBe("△ 基礎知識");
  });
});
