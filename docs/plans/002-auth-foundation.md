# 002 認証基盤(Auth.js・開発用ログイン・GitHub SSO)

## 目的

Auth.js v5 + Prismaアダプタによる認証基盤を構築し、事前登録メール照合によるSSOログイン(GitHub)と、開発・動作確認用の社員IDログインを提供する。

## 前提(依存するplan)

- 001 DBスキーマ(`users`/`accounts`/`sessions`/`verification_tokens`と`employee`)
- GitHub OAuthアプリの登録(`AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET`)。未設定でも壊れないこと

## 実装内容

- `lib/auth.ts`: NextAuth設定の一元管理
  - PrismaAdapter + セッション戦略の切替(開発用ログイン有効時はjwt、無効時はdatabase。docs/decisions.md「認証」参照)
  - GitHubプロバイダ: `userinfo`を差し替えて`/user/emails`から「確認済み(verified)かつプライマリ」のメールのみ採用。`allowDangerousEmailAccountLinking: true`(signInコールバックの事前照合とセットで維持)
  - Credentialsプロバイダ`dev-employee-id`(開発用ログイン): 非本番または`ENABLE_DEV_LOGIN=true`でのみ登録
  - signInコールバック: `resolveSsoLogin`で事前登録照合し、エラー時は`/login?error=<code>`への文字列を返してリダイレクト
  - signInイベント: `users.last_login_at`更新(updatedBy=本人・updatedProgram="AUTH001")。人事・営業は`is_registered`自動TRUE+SSO表示名で`employee.name`補完(未設定時のみ)
  - jwt/sessionコールバック: セッションに`employeeId`/`role`を格納
- `lib/sso-login.ts`: `resolveSsoLogin`(メール小文字化→users検索→未登録/退職/プロバイダ不一致判定)と`pickVerifiedPrimaryEmail`。純粋関数+単体テスト
- `lib/dev-login.ts`: 社員IDからのユーザー解決(未登録・退職判定含む)+単体テスト
- `lib/auth-errors.ts`: エラーコード⇔日本語文言の変換(`messageForLoginErrorCode`)+単体テスト
- `lib/env.ts`: `isProduction`/`isDevLoginEnabled`/`isGitHubSsoEnabled`の判定を一元化

## 受け入れ基準

- 事前登録済みメールのGitHubアカウントでログインでき、`accounts`に紐付けが自動作成される
- 未登録メール・退職済み・プロバイダ不一致で docs/screens.md AUTH001 のエラーコードが返る
- 確認済みでないメールしか持たないGitHubアカウントは未登録エラーになる
- `NODE_ENV=production`かつ`ENABLE_DEV_LOGIN`未設定では開発用ログインが無効
- ログイン成功のたびに`last_login_at`が更新される

## 検証方法

1. `lib/sso-login.test.ts`・`lib/dev-login.test.ts`・`lib/auth-errors.test.ts`で判定ロジックを網羅する(DBはモック)
2. 開発サーバーで開発用ログイン(社員ID)によるログイン・ログアウトを確認する
3. GitHub OAuth設定済み環境で実SSOログインを1往復確認する
4. `npm run verify`が通ることを確認する
