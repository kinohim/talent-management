import { describe, expect, it } from "vitest";

import { parseUnitNameForm } from "./organization-unit-schema";

function formDataWith(unitName: string | null): FormData {
  const formData = new FormData();
  if (unitName !== null) formData.set("unitName", unitName);
  return formData;
}

describe("parseUnitNameForm", () => {
  it("正常な名称を受け付ける", () => {
    const result = parseUnitNameForm(formDataWith("システム事業部"));
    expect(result).toEqual({ success: true, unitName: "システム事業部" });
  });

  it("前後の空白はtrimされる", () => {
    const result = parseUnitNameForm(formDataWith("  開発部  "));
    expect(result).toEqual({ success: true, unitName: "開発部" });
  });

  it("空文字はエラー", () => {
    const result = parseUnitNameForm(formDataWith(""));
    expect(result.success).toBe(false);
  });

  it("未入力(フィールド自体が無い)はエラー", () => {
    const result = parseUnitNameForm(formDataWith(null));
    expect(result.success).toBe(false);
  });

  it("100文字ちょうどは許可", () => {
    const result = parseUnitNameForm(formDataWith("あ".repeat(100)));
    expect(result.success).toBe(true);
  });

  it("101文字はエラー", () => {
    const result = parseUnitNameForm(formDataWith("あ".repeat(101)));
    expect(result.success).toBe(false);
  });
});
