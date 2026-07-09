import { describe, expect, it } from "vitest";

import {
  NotRegisteredError,
  ProviderMismatchError,
  RetiredEmployeeError,
  messageForLoginError,
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

  it("ProviderMismatchErrorならプロバイダ不一致の文言を返す", () => {
    expect(messageForLoginError(new ProviderMismatchError())).toBe(
      "このアカウントは別のログイン方法で登録されています。初回に使用したログイン方法をお使いください。",
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
