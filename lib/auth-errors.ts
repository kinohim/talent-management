// next-authの主要エクスポート("next-auth")経由でCredentialsSigninをimportすると
// Next.js固有のモジュール(next/server)まで読み込まれ、Vitest(Node実行)から
// importした際に解決エラーになる。next-authが依存する@auth/coreから直接
// importすることでこれを避ける(next-auth 5.0.0-beta.31は@auth/core@0.41.2に
// 固定依存しており、package.jsonにも同バージョンを明示的に追加済み)。
import { CredentialsSignin } from "@auth/core/errors";

// AUTH001のエラー文言(docs/screens.md参照)に対応するcode。
// authorize()内でCredentialsSigninのサブクラスをthrowすると、signIn()の
// 戻り値(result.error)にそのcodeが伝播する(Auth.jsの仕組み)。

export class NotRegisteredError extends CredentialsSignin {
  code = "not-registered";
}

export class RetiredEmployeeError extends CredentialsSignin {
  code = "retired";
}

// 実SSO実装時、signInコールバックで「紐付き済みaccounts.providerと異なる
// プロバイダで認証された」場合にthrowする想定の分岐点。現状は開発用ログイン
// (プロバイダ1つのみ)のため到達しないが、文言だけ先に用意しておく。
export class ProviderMismatchError extends CredentialsSignin {
  code = "provider-mismatch";
}

const MESSAGES: Record<string, string> = {
  "not-registered":
    "このメールアドレスは登録されていません。管理者に新規登録を依頼してください。",
  retired:
    "このアカウントは無効化されています。心当たりがない場合は管理者にお問い合わせください。",
  "provider-mismatch":
    "このアカウントは別のログイン方法で登録されています。初回に使用したログイン方法をお使いください。",
};

const DEFAULT_MESSAGE = "ログインできませんでした。時間をおいて再度お試しください。";

export function messageForLoginError(error: unknown): string {
  if (error instanceof CredentialsSignin) {
    return MESSAGES[error.code] ?? DEFAULT_MESSAGE;
  }
  return DEFAULT_MESSAGE;
}
