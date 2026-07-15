// クライアントコンポーネント(SkillRowsForm等)からも直接importされるため、
// このファイルはPrismaランタイムを巻き込まないよう生成クライアントからは
// 型のみをimportする(enumの値参照はせず文字列リテラルキーで定義する)。
import type {
  FinalSchoolType,
  Gender,
  GraduationStatus,
  SkillLevel,
} from "@/generated/prisma/client";

const GENDER_LABELS: Record<Gender, string> = {
  MALE: "男性",
  FEMALE: "女性",
  OTHER: "その他",
};

export function genderLabel(gender: Gender | null): string {
  return gender ? GENDER_LABELS[gender] : "";
}

const FINAL_SCHOOL_TYPE_LABELS: Record<FinalSchoolType, string> = {
  HIGH_SCHOOL: "高校",
  VOCATIONAL_SCHOOL: "専門学校",
  JUNIOR_COLLEGE: "短大",
  UNIVERSITY: "大学",
  GRADUATE_SCHOOL: "大学院",
};

export function finalSchoolTypeLabel(type: FinalSchoolType | null): string {
  return type ? FINAL_SCHOOL_TYPE_LABELS[type] : "";
}

const GRADUATION_STATUS_LABELS: Record<GraduationStatus, string> = {
  GRADUATED: "卒業",
  WITHDRAWN: "中退",
};

export function graduationStatusLabel(status: GraduationStatus | null): string {
  return status ? GRADUATION_STATUS_LABELS[status] : "";
}

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  EXPERT: "◎ 得意",
  EXPERIENCED: "○ 経験あり",
  BASIC: "△ 基礎知識",
};

export function skillLevelLabel(level: SkillLevel): string {
  return SKILL_LEVEL_LABELS[level];
}

const SKILL_LEVEL_SYMBOLS: Record<SkillLevel, string> = {
  EXPERT: "◎",
  EXPERIENCED: "○",
  BASIC: "△",
};

// タグ表示など省スペースな箇所向けの記号のみの習熟度表記。
// 記号の意味は skillLevelLabel を凡例として併記すること。
export function skillLevelSymbol(level: SkillLevel): string {
  return SKILL_LEVEL_SYMBOLS[level];
}

// 管理職がEDT006/EDT007で登録した氏名は、本人の初回登録(EDT001保存で
// is_registered=true)が済むまで「◯◯（仮登録）」と表示する(docs/decisions.md)。
// nameには素の氏名のみを保存し、接尾辞は表示時に付与する(表示ルール方式)。
export function employeeDisplayName(
  name: string | null,
  isRegistered: boolean,
): string | null {
  if (!name) return null;
  return isRegistered ? name : `${name}（仮登録）`;
}
