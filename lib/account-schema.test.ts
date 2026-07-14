import { describe, expect, it } from "vitest";

import { parseEditAccountForm, parseNewAccountForm } from "./account-schema";

function formDataWith(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("parseNewAccountForm", () => {
  it("正常な入力で成功する", () => {
    const result = parseNewAccountForm(
      formDataWith({ employeeId: "000010", email: "taro@example.com", role: "EMPLOYEE" }),
    );
    expect(result).toEqual({
      success: true,
      data: { employeeId: "000010", email: "taro@example.com", role: "EMPLOYEE" },
    });
  });

  it("社員IDが6桁でなければエラー", () => {
    expect(
      parseNewAccountForm(
        formDataWith({ employeeId: "12345", email: "a@example.com", role: "EMPLOYEE" }),
      ).success,
    ).toBe(false);
  });

  it("社員IDが数字以外を含むとエラー", () => {
    expect(
      parseNewAccountForm(
        formDataWith({ employeeId: "00001a", email: "a@example.com", role: "EMPLOYEE" }),
      ).success,
    ).toBe(false);
  });

  it("メールアドレスの形式が不正ならエラー", () => {
    expect(
      parseNewAccountForm(
        formDataWith({ employeeId: "000010", email: "not-an-email", role: "EMPLOYEE" }),
      ).success,
    ).toBe(false);
  });

  it("権限が未指定ならエラー", () => {
    expect(
      parseNewAccountForm(
        formDataWith({ employeeId: "000010", email: "a@example.com", role: "" }),
      ).success,
    ).toBe(false);
  });
});

describe("parseEditAccountForm", () => {
  it("正常な入力で成功する(社員ID・メール・権限)", () => {
    expect(
      parseEditAccountForm(
        formDataWith({ employeeId: "000010", email: "taro@example.com", role: "MANAGER" }),
      ),
    ).toEqual({
      success: true,
      data: { employeeId: "000010", email: "taro@example.com", role: "MANAGER" },
    });
  });

  it("社員IDが6桁の数字でなければエラー", () => {
    expect(
      parseEditAccountForm(
        formDataWith({ employeeId: "12345", email: "a@example.com", role: "MANAGER" }),
      ).success,
    ).toBe(false);
    expect(
      parseEditAccountForm(
        formDataWith({ employeeId: "abc123", email: "a@example.com", role: "MANAGER" }),
      ).success,
    ).toBe(false);
  });

  it("メールアドレスの形式が不正ならエラー", () => {
    expect(
      parseEditAccountForm(
        formDataWith({ employeeId: "000010", email: "not-an-email", role: "MANAGER" }),
      ).success,
    ).toBe(false);
  });

  it("権限が未指定ならエラー", () => {
    expect(
      parseEditAccountForm(
        formDataWith({ employeeId: "000010", email: "a@example.com", role: "" }),
      ).success,
    ).toBe(false);
  });
});
