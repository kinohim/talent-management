import { z } from "zod";

import { PREFECTURES } from "@/lib/prefectures";

const siteNameSchema = z
  .string()
  .trim()
  .min(1, "現場名を入力してください。")
  .max(100, "現場名は100文字以内で入力してください。");

// 主管部署は任意(未選択は空文字=null)。実在チェックはaction側で行う
const organizationUnitIdSchema = z
  .string()
  .regex(/^\d*$/, "主管部署の指定が正しくありません。")
  .transform((value) => (value === "" ? null : Number(value)));

const nearestStationPrefectureSchema = z
  .string()
  .trim()
  .max(100, "都道府県は100文字以内で入力してください。")
  .optional()
  .transform((value) => (value === "" ? undefined : value))
  .refine(
    (value) => value === undefined || PREFECTURES.includes(value),
    "都道府県の指定が正しくありません。",
  );

const nearestStationLineSchema = z
  .string()
  .trim()
  .max(100, "路線名は100文字以内で入力してください。")
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const nearestStationNameSchema = z
  .string()
  .trim()
  .max(100, "駅名は100文字以内で入力してください。")
  .optional()
  .transform((value) => (value === "" ? undefined : value));

export type SiteMasterFormState = { error: string | null };

export type SiteMasterFormParseResult =
  | {
      success: true;
      siteName: string;
      organizationUnitId: number | null;
      nearestStationPrefecture: string | undefined;
      nearestStationLine: string | undefined;
      nearestStationName: string | undefined;
    }
  | { success: false; error: string };

export function parseSiteMasterForm(formData: FormData): SiteMasterFormParseResult {
  const parsed = siteNameSchema.safeParse(formData.get("siteName"));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const orgParsed = organizationUnitIdSchema.safeParse(
    formData.get("organizationUnitId")?.toString() ?? "",
  );
  if (!orgParsed.success) {
    return { success: false, error: orgParsed.error.issues[0].message };
  }
  const prefectureParsed = nearestStationPrefectureSchema.safeParse(
    formData.get("nearestStationPrefecture")?.toString(),
  );
  if (!prefectureParsed.success) {
    return { success: false, error: prefectureParsed.error.issues[0].message };
  }
  const lineParsed = nearestStationLineSchema.safeParse(
    formData.get("nearestStationLine")?.toString(),
  );
  if (!lineParsed.success) {
    return { success: false, error: lineParsed.error.issues[0].message };
  }
  const nameParsed = nearestStationNameSchema.safeParse(
    formData.get("nearestStationName")?.toString(),
  );
  if (!nameParsed.success) {
    return { success: false, error: nameParsed.error.issues[0].message };
  }
  return {
    success: true,
    siteName: parsed.data,
    organizationUnitId: orgParsed.data,
    nearestStationPrefecture: prefectureParsed.data,
    nearestStationLine: lineParsed.data,
    nearestStationName: nameParsed.data,
  };
}
