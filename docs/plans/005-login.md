# 005 login ログイン画面

## 目的

Auth.js標準の英語ログイン画面を使わず、docs/screens.md login の自前の日本語ログイン画面を提供する。

## 前提(依存するplan)

- 002 認証基盤

## 実装内容

- `app/login/page.tsx`+`app/login/actions.ts`: ログイン画面(認証グループ外のルート)。`lib/auth.ts`の`pages: { signIn: "/login" }`で差し替える。ログイン済みユーザーが`/login`へアクセスした場合は`/`へリダイレクトする
- `components/auth/SsoLoginButtons.tsx`: SSOボタン3つ。並び順はMicrosoft→Google→GitHub(準備中を先頭に)。活性・非活性を問わず各プロバイダのイメージカラーで配色し、非活性には時計アイコン+「(準備中)」を付ける。Azure AD/Googleは非活性固定、GitHubは環境変数未設定時のみ非活性
- 開発用ログインフォーム: SSOボタンと視覚的に区分し、説明文2行(「開発・動作確認専用の仮ログインです。」「社員IDのみでログインできます。」)を表示。有効条件は002に従う
- エラー表示: Server Action経由(開発用ログイン)とクエリ`?error=<code>`経由(OAuth)の両方を`lib/auth-errors.ts`で日本語文言に変換して表示する(未登録・退職済み・プロバイダ不一致。それ以外のコードは既定文言。文言はdocs/screens.md login)
- ログイン成功後の遷移: 常に`/`(home)へリダイレクトする。`is_registered=false`の一般社員/管理職は、認証必須ページ共通のガード(002の`resolveDestination`)により`/basic-info`(basic-info)へ誘導される

## 受け入れ基準

- docs/screens.md login のボタン構成・配色・準備中表記・エラー文言を満たす
- 3種のエラー(未登録・退職済み・プロバイダ不一致)がそれぞれ正しい日本語文言で表示される
- 初回ログインの導線(未登録の一般社員/管理職はbasic-infoへ誘導、人事・営業はhome直行)が仕様どおり動く

## 検証方法

1. Playwrightで開発用ログインの成功・未登録エラー・退職者エラーを確認する
2. `is_registered=false`の一般社員でログインし`/basic-info`へ、人事・営業でログインし`/`へ到達することを確認する
3. `npm run verify`が通ることを確認する
