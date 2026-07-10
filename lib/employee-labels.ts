import {
  FinalSchoolType,
  Gender,
  GraduationStatus,
  SkillLevel,
} from "@/generated/prisma/client";

const GENDER_LABELS: Record<Gender, string> = {
  [Gender.MALE]: "男性",
  [Gender.FEMALE]: "女性",
  [Gender.OTHER]: "その他",
};

export function genderLabel(gender: Gender | null): string {
  return gender ? GENDER_LABELS[gender] : "";
}

const FINAL_SCHOOL_TYPE_LABELS: Record<FinalSchoolType, string> = {
  [FinalSchoolType.HIGH_SCHOOL]: "高校",
  [FinalSchoolType.VOCATIONAL_SCHOOL]: "専門学校",
  [FinalSchoolType.JUNIOR_COLLEGE]: "短大",
  [FinalSchoolType.UNIVERSITY]: "大学",
  [FinalSchoolType.GRADUATE_SCHOOL]: "大学院",
};

export function finalSchoolTypeLabel(type: FinalSchoolType | null): string {
  return type ? FINAL_SCHOOL_TYPE_LABELS[type] : "";
}

const GRADUATION_STATUS_LABELS: Record<GraduationStatus, string> = {
  [GraduationStatus.GRADUATED]: "卒業",
  [GraduationStatus.WITHDRAWN]: "中退",
};

export function graduationStatusLabel(status: GraduationStatus | null): string {
  return status ? GRADUATION_STATUS_LABELS[status] : "";
}

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  [SkillLevel.EXPERT]: "◎ 得意",
  [SkillLevel.EXPERIENCED]: "○ 経験あり",
  [SkillLevel.BASIC]: "△ 基礎知識",
};

export function skillLevelLabel(level: SkillLevel): string {
  return SKILL_LEVEL_LABELS[level];
}
