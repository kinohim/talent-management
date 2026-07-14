import { describe, expect, it } from "vitest";

import {
  NotRegisteredError,
  RetiredEmployeeError,
  messageForLoginError,
  messageForLoginErrorCode,
} from "./auth-errors";

describe("messageForLoginError", () => {
  it("NotRegisteredErrorなら未登録の文言を返す", () => {
    expect(messageForLoginError(new NotRegisteredError())).toBe(
      "このメールアドレスは登録されていません。管理者に新規登録を依頼してください。",
    );
  });

  it("RetiredEmployeeErrorなら退職済みの文言を返す", () => {
    expect(messageForLoginError(new RetiredEmployeeError())).toBe(
      "このアカウントは無効化されています。心当たりがない場合は管理者にお問い合わせください。",
    );
  });

  it("未知のエラーならデフォルト文言を返す", () => {
    expect(messageForLoginError(new Error("unknown"))).toBe(
      "ログインできませんでした。時間をおいて再度お試しください。",
    );
    expect(messageForLoginError(null)).toBe(
      "ログインできませんでした。時間をおいて再度お試しください。",
    );
  });
});

describe("messageForLoginErrorCode", () => {
  it("not-registeredなら未登録の文言を返す", () => {
    expect(messageForLoginErrorCode("not-registered")).toBe(
      "このメールアドレスは登録されていません。管理者に新規登録を依頼してください。",
    );
  });

  it("retiredなら退職済みの文言を返す", () => {
    expect(messageForLoginErrorCode("retired")).toBe(
      "このアカウントは無効化されています。心当たりがない場合は管理者にお問い合わせください。",
    );
  });

  it("provider-mismatchならプロバイダ不一致の文言を返す", () => {
    expect(messageForLoginErrorCode("provider-mismatch")).toBe(
      "このアカウントは別のログイン方法で登録されています。初回に使用したログイン方法をお使いください。",
    );
  });

  it("未知のcode(Auth.js標準エラー等)ならデフォルト文言を返す", () => {
    expect(messageForLoginErrorCode("Configuration")).toBe(
      "ログインできませんでした。時間をおいて再度お試しください。",
    );
    expect(messageForLoginErrorCode("")).toBe(
      "ログインできませんでした。時間をおいて再度お試しください。",
    );
  });
});
