import { z } from "zod";

import { PREFECTURES } from "@/lib/prefectures";

// 全角カタカナ＋長音符・全角/半角スペースのみ許可。
// (「ヤマダ タロウ」のような区切りスペースを許容する。この範囲は仕様に明記が
//  ないための実装判断。厳格化が必要なら要件確認のうえ調整する)
const KATAKANA_PATTERN = /^[゠-ヿ　\s]+$/;

export const basicInfoSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "氏名を入力してください。")
    .max(50, "氏名は50文字以内で入力してください。"),
  nameKana: z
    .string()
    .trim()
    .min(1, "カナを入力してください。")
    .max(50, "カナは50文字以内で入力してください。")
    .regex(KATAKANA_PATTERN, "カナは全角カタカナで入力してください。")
    // PDF出力(pdf-preview)のイニシャル生成が姓・名の区切りを前提とするため、
    // 「姓 名」のちょうど2語(スペース区切り)を必須とする(docs/screens.md basic-info)
    .refine(
      (value) => value.split(/[\s　]+/).filter(Boolean).length === 2,
      "カナは姓と名の間にスペースを入れて入力してください。",
    ),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "生年月日を入力してください。"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  divisionId: z.string().regex(/^\d+$/).optional(),
  departmentId: z.string().regex(/^\d+$/).optional(),
  groupId: z.string().regex(/^\d+$/).optional(),
  nearestStationPrefecture: z
    .string()
    .trim()
    .max(100, "都道府県は100文字以内で入力してください。")
    .optional()
    .refine(
      (value) => value === undefined || PREFECTURES.includes(value),
      "都道府県の指定が正しくありません。",
    ),
  nearestStationLine: z
    .string()
    .trim()
    .max(100, "路線名は100文字以内で入力してください。")
    .optional(),
  nearestStationName: z
    .string()
    .trim()
    .max(100, "駅名は100文字以内で入力してください。")
    .optional(),
  finalSchoolType: z
    .enum([
      "HIGH_SCHOOL",
      "VOCATIONAL_SCHOOL",
      "JUNIOR_COLLEGE",
      "UNIVERSITY",
      "GRADUATE_SCHOOL",
    ])
    .optional(),
  finalSchoolName: z
    .string()
    .trim()
    .max(100, "学校名は100文字以内で入力してください。")
    .optional(),
  finalDepartmentName: z
    .string()
    .trim()
    .max(100, "学部・学科名は100文字以内で入力してください。")
    .optional(),
  graduationStatus: z.enum(["GRADUATED", "WITHDRAWN"]).optional(),
  graduationYearMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "卒業年月の形式が正しくありません。")
    .optional(),
});

export type BasicInfoInput = z.infer<typeof basicInfoSchema>;
export type BasicInfoFieldErrors = Partial<Record<keyof BasicInfoInput, string>>;

function readField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function parseBasicInfoForm(formData: FormData) {
  return basicInfoSchema.safeParse({
    name: readField(formData, "name"),
    nameKana: readField(formData, "nameKana"),
    birthDate: readField(formData, "birthDate"),
    gender: readField(formData, "gender"),
    divisionId: readField(formData, "divisionId"),
    departmentId: readField(formData, "departmentId"),
    groupId: readField(formData, "groupId"),
    nearestStationPrefecture: readField(formData, "nearestStationPrefecture"),
    nearestStationLine: readField(formData, "nearestStationLine"),
    nearestStationName: readField(formData, "nearestStationName"),
    finalSchoolType: readField(formData, "finalSchoolType"),
    finalSchoolName: readField(formData, "finalSchoolName"),
    finalDepartmentName: readField(formData, "finalDepartmentName"),
    graduationStatus: readField(formData, "graduationStatus"),
    graduationYearMonth: readField(formData, "graduationYearMonth"),
  });
}

export function flattenFieldErrors(
  error: z.ZodError<BasicInfoInput>,
): BasicInfoFieldErrors {
  const flat = error.flatten().fieldErrors;
  const result: BasicInfoFieldErrors = {};
  for (const key of Object.keys(flat) as (keyof BasicInfoInput)[]) {
    const messages = flat[key];
    if (messages?.[0]) result[key] = messages[0];
  }
  return result;
}
