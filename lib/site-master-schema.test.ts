import { describe, expect, it } from "vitest";

import { parseSiteMasterForm } from "./site-master-schema";

function formDataWith(siteName: string | null): FormData {
  const formData = new FormData();
  if (siteName !== null) formData.set("siteName", siteName);
  return formData;
}

describe("parseSiteMasterForm", () => {
  it("正常な現場名を受け付ける", () => {
    const result = parseSiteMasterForm(formDataWith("A社基幹システム更改"));
    expect(result).toEqual({ success: true, siteName: "A社基幹システム更改" });
  });

  it("前後の空白はtrimされる", () => {
    const result = parseSiteMasterForm(formDataWith("  B社ECサイト構築  "));
    expect(result).toEqual({ success: true, siteName: "B社ECサイト構築" });
  });

  it("空文字はエラー", () => {
    expect(parseSiteMasterForm(formDataWith("")).success).toBe(false);
  });

  it("未入力(フィールド自体が無い)はエラー", () => {
    expect(parseSiteMasterForm(formDataWith(null)).success).toBe(false);
  });

  it("100文字ちょうどは許可", () => {
    expect(parseSiteMasterForm(formDataWith("あ".repeat(100))).success).toBe(true);
  });

  it("101文字はエラー", () => {
    expect(parseSiteMasterForm(formDataWith("あ".repeat(101))).success).toBe(false);
  });
});
