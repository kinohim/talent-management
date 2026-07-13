export const isProduction = process.env.NODE_ENV === "production";

// 実SSO未実装のため、本番相当環境でも一時的に開発用ログインを使えるようにする
// フラグ(docs/decisions.md「認証」参照)。実SSO実装時にこのフラグごと削除する。
export const isDevLoginEnabled = process.env.ENABLE_DEV_LOGIN === "true";
