import { describe, expect, it } from "vitest";

import { parseProjectRoleMasterForm } from "./project-role-master-schema";

function formDataWith(projectRoleName: string | null): FormData {
  const formData = new FormData();
  if (projectRoleName !== null) formData.set("projectRoleName", projectRoleName);
  return formData;
}

describe("parseProjectRoleMasterForm", () => {
  it("正常な役割名を受け付ける", () => {
    const result = parseProjectRoleMasterForm(formDataWith("リーダー"));
    expect(result).toEqual({ success: true, projectRoleName: "リーダー" });
  });

  it("前後の空白はtrimされる", () => {
    const result = parseProjectRoleMasterForm(formDataWith("  PG  "));
    expect(result).toEqual({ success: true, projectRoleName: "PG" });
  });

  it("空文字はエラー", () => {
    expect(parseProjectRoleMasterForm(formDataWith("")).success).toBe(false);
  });

  it("未入力(フィールド自体が無い)はエラー", () => {
    expect(parseProjectRoleMasterForm(formDataWith(null)).success).toBe(false);
  });

  it("20文字ちょうどは許可", () => {
    expect(parseProjectRoleMasterForm(formDataWith("あ".repeat(20))).success).toBe(true);
  });

  it("21文字はエラー", () => {
    expect(parseProjectRoleMasterForm(formDataWith("あ".repeat(21))).success).toBe(false);
  });
});
