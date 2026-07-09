import { describe, expect, it } from "vitest";

import { flattenFieldErrors, parseCareerSummaryForm } from "./career-summary-schema";

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

describe("parseCareerSummaryForm", () => {
  it("両方未入力でも成功する(任意項目)", () => {
    const result = parseCareerSummaryForm(formData({}));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.careerSummary).toBeUndefined();
      expect(result.data.selfPr).toBeUndefined();
    }
  });

  it("1000文字以内なら成功する", () => {
    const result = parseCareerSummaryForm(
      formData({
        careerSummary: "あ".repeat(1000),
        selfPr: "い".repeat(1000),
      }),
    );
    expect(result.success).toBe(true);
  });

  it("経歴概要が1001文字なら失敗する", () => {
    const result = parseCareerSummaryForm(
      formData({ careerSummary: "あ".repeat(1001) }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(flattenFieldErrors(result.error).careerSummary).toBe(
        "経歴概要は1000文字以内で入力してください。",
      );
    }
  });

  it("自己PRが1001文字なら失敗する", () => {
    const result = parseCareerSummaryForm(
      formData({ selfPr: "あ".repeat(1001) }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(flattenFieldErrors(result.error).selfPr).toBe(
        "自己PRは1000文字以内で入力してください。",
      );
    }
  });
});
