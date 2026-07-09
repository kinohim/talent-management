import { z } from "zod";

export const careerSummarySchema = z.object({
  careerSummary: z
    .string()
    .trim()
    .max(1000, "経歴概要は1000文字以内で入力してください。")
    .optional(),
  selfPr: z
    .string()
    .trim()
    .max(1000, "自己PRは1000文字以内で入力してください。")
    .optional(),
});

export type CareerSummaryInput = z.infer<typeof careerSummarySchema>;
export type CareerSummaryFieldErrors = Partial<
  Record<keyof CareerSummaryInput, string>
>;

function readField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function parseCareerSummaryForm(formData: FormData) {
  return careerSummarySchema.safeParse({
    careerSummary: readField(formData, "careerSummary"),
    selfPr: readField(formData, "selfPr"),
  });
}

export function flattenFieldErrors(
  error: z.ZodError<CareerSummaryInput>,
): CareerSummaryFieldErrors {
  const flat = error.flatten().fieldErrors;
  const result: CareerSummaryFieldErrors = {};
  for (const key of Object.keys(flat) as (keyof CareerSummaryInput)[]) {
    const messages = flat[key];
    if (messages?.[0]) result[key] = messages[0];
  }
  return result;
}
