export const isProduction = process.env.NODE_ENV === "production";

// 実運用開始前のため、本番相当環境でも一時的に開発用ログインを使えるようにする
// フラグ(docs/decisions.md「認証」参照)。実運用開始時にこのフラグごと削除する。
export const isDevLoginEnabled = process.env.ENABLE_DEV_LOGIN === "true";

// GitHub SSOのクレデンシャルが設定されている場合のみGitHubログインを有効化する。
// OAuthアプリ未登録の環境でもログイン画面・認証フローが壊れないようにするため、
// 未設定時はプロバイダ登録もボタン活性も行わない。
export const isGitHubSsoEnabled = Boolean(
  process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET,
);
