import { describe, expect, it } from "vitest";

import { parseSiteMasterForm } from "./site-master-schema";

function formDataWith(
  siteName: string | null,
  organizationUnitId?: string,
): FormData {
  const formData = new FormData();
  if (siteName !== null) formData.set("siteName", siteName);
  if (organizationUnitId !== undefined) {
    formData.set("organizationUnitId", organizationUnitId);
  }
  return formData;
}

describe("parseSiteMasterForm", () => {
  it("正常な現場名を受け付ける(主管部署未指定はnull)", () => {
    const result = parseSiteMasterForm(formDataWith("A社基幹システム更改"));
    expect(result).toEqual({
      success: true,
      siteName: "A社基幹システム更改",
      organizationUnitId: null,
    });
  });

  it("前後の空白はtrimされる", () => {
    const result = parseSiteMasterForm(formDataWith("  B社ECサイト構築  "));
    expect(result).toEqual({
      success: true,
      siteName: "B社ECサイト構築",
      organizationUnitId: null,
    });
  });

  it("主管部署のidを数値で受け付ける(空文字はnull)", () => {
    expect(parseSiteMasterForm(formDataWith("C社", "12"))).toEqual({
      success: true,
      siteName: "C社",
      organizationUnitId: 12,
    });
    expect(parseSiteMasterForm(formDataWith("C社", ""))).toEqual({
      success: true,
      siteName: "C社",
      organizationUnitId: null,
    });
  });

  it("主管部署が数値でなければエラー", () => {
    expect(parseSiteMasterForm(formDataWith("C社", "abc")).success).toBe(false);
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
