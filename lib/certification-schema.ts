import { z } from "zod";

import { parseDateOnly } from "@/lib/date-format";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const certificationRowSchema = z
  .object({
    certificationCategoryId: z
      .string()
      .regex(/^\d+$/, "カテゴリを選択してください。"),
    certificationId: z.string().regex(/^\d+$/, "資格名を選択してください。"),
    acquiredDate: z
      .string()
      .regex(DATE_ONLY_PATTERN, "取得年月日を入力してください。"),
    expirationDate: z
      .string()
      .regex(DATE_ONLY_PATTERN, "有効期限の形式が不正です。")
      .optional(),
  })
  .check((ctx) => {
    const { acquiredDate, expirationDate } = ctx.value;
    if (!DATE_ONLY_PATTERN.test(acquiredDate)) return;

    const today = new Date();
    const todayDateOnly = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
    );
    if (parseDateOnly(acquiredDate).getTime() > todayDateOnly.getTime()) {
      ctx.issues.push({
        code: "custom",
        message: "取得年月日は本日以前の日付を入力してください。",
        path: ["acquiredDate"],
        input: ctx.value,
      });
    }

    if (expirationDate && DATE_ONLY_PATTERN.test(expirationDate)) {
      if (
        parseDateOnly(expirationDate).getTime() <=
        parseDateOnly(acquiredDate).getTime()
      ) {
        ctx.issues.push({
          code: "custom",
          message: "有効期限は取得年月日より後の日付を入力してください。",
          path: ["expirationDate"],
          input: ctx.value,
        });
      }
    }
  });

export type CertificationRowInput = z.infer<typeof certificationRowSchema>;
export type CertificationRowFieldErrors = Partial<
  Record<keyof CertificationRowInput, string>
>;

export type CertificationFormParseResult =
  | { success: true; rows: CertificationRowInput[] }
  | {
      success: false;
      rowErrors: Record<number, CertificationRowFieldErrors>;
      formError: string | null;
    };

const ROW_KEY_PATTERN =
  /^items\.(\d+)\.(certificationCategoryId|certificationId|acquiredDate|expirationDate)$/;

// CertificationRowsFormは行を`items.<index>.<field>`という名前でFormDataに乗せる。
// 行の追加・削除でindexが欠番になっても(例: 0, 2)動作するようMapで集約する。
function collectRows(formData: FormData): Map<number, Record<string, string>> {
  const rows = new Map<number, Record<string, string>>();
  for (const [key, value] of formData.entries()) {
    const match = ROW_KEY_PATTERN.exec(key);
    if (!match || typeof value !== "string") continue;
    const index = Number(match[1]);
    const field = match[2];
    const row = rows.get(index) ?? {};
    row[field] = value;
    rows.set(index, row);
  }
  return rows;
}

function flattenRowFieldErrors(
  error: z.ZodError<CertificationRowInput>,
): CertificationRowFieldErrors {
  const flat = error.flatten().fieldErrors;
  const result: CertificationRowFieldErrors = {};
  for (const key of Object.keys(flat) as (keyof CertificationRowInput)[]) {
    const messages = flat[key];
    if (messages?.[0]) result[key] = messages[0];
  }
  return result;
}

export function parseCertificationRowsForm(
  formData: FormData,
): CertificationFormParseResult {
  const rowsMap = collectRows(formData);
  const indices = [...rowsMap.keys()].sort((a, b) => a - b);

  const rowErrors: Record<number, CertificationRowFieldErrors> = {};
  const rows: CertificationRowInput[] = [];

  for (const index of indices) {
    const raw = rowsMap.get(index) ?? {};
    const parsed = certificationRowSchema.safeParse({
      certificationCategoryId: raw.certificationCategoryId ?? "",
      certificationId: raw.certificationId ?? "",
      acquiredDate: raw.acquiredDate ?? "",
      expirationDate: raw.expirationDate || undefined,
    });
    if (!parsed.success) {
      rowErrors[index] = flattenRowFieldErrors(parsed.error);
      continue;
    }
    rows.push(parsed.data);
  }

  if (Object.keys(rowErrors).length > 0) {
    return { success: false, rowErrors, formError: null };
  }

  return { success: true, rows };
}
