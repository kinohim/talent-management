# 認証・認可 テスト仕様

ログイン（SSO・開発用）の事前登録照合、ログイン後の遷移先判定、ロールによるページガード、
ログインエラー文言の変換をテストする。

| テストファイル | 対象ソース | ケース数 |
|---|---|---|
| `lib/auth-guards.test.ts` | `lib/auth-guards.ts` | 3 |
| `lib/auth-routing.test.ts` | `lib/auth-routing.ts` | 6 |
| `lib/auth-errors.test.ts` | `lib/auth-errors.ts` | 7 |
| `lib/sso-login.test.ts` | `lib/sso-login.ts` | 10 |
| `lib/dev-login.test.ts` | `lib/dev-login.ts` | 5 |

## requireManager

対象: `lib/auth-guards.ts` / テスト: `lib/auth-guards.test.ts`
概要: マスタ管理画面共通のロールチェック。未ログインは /login、管理職以外は / へ差し戻す
前提: `vi.mock` で next/navigation と @/lib/auth をモック（redirect は throw で検知）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | 未ログインなら /login へ redirect する | 異常系 |
| 2 | MANAGER 以外なら / へ redirect する | 異常系 |
| 3 | MANAGER なら session.user を返す | 正常系 |

## isEmployeeRegistered

対象: `lib/auth-routing.ts` / テスト: `lib/auth-routing.test.ts`
概要: employee.isRegistered を参照し、本登録済みかどうかを返す
前提: `vi.mock` で Prisma をモック

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | isRegistered=true なら true を返す | 正常系 |
| 2 | isRegistered=false なら false を返す | 正常系 |
| 3 | 該当 employee がなければ false を返す | 異常系 |

## resolveDestination

対象: `lib/auth-routing.ts` / テスト: `lib/auth-routing.test.ts`
概要: ログイン成功直後・home の恒常ガードから呼ばれ、遷移先（/ または /basic-info）を一元的に判定する
前提: `vi.mock` で Prisma をモック

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | HR_SALES は isRegistered を問わず常に / を返す（DB 照会しない） | 正常系 |
| 2 | EMPLOYEE で isRegistered=false なら /basic-info を返す | 正常系 |
| 3 | MANAGER で isRegistered=true なら / を返す | 正常系 |

## messageForLoginError

対象: `lib/auth-errors.ts` / テスト: `lib/auth-errors.test.ts`
概要: authorize() が throw した CredentialsSignin 系エラーを日本語のログインエラー文言に変換する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | NotRegisteredError なら未登録の文言を返す | 正常系 |
| 2 | RetiredEmployeeError なら退職済みの文言を返す | 正常系 |
| 3 | 未知のエラー・null ならデフォルト文言を返す | 異常系 |

## messageForLoginErrorCode

対象: `lib/auth-errors.ts` / テスト: `lib/auth-errors.test.ts`
概要: SSO フローで `/login?error=<code>` に渡されるエラー code から日本語文言を引く
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | not-registered なら未登録の文言を返す | 正常系 |
| 2 | retired なら退職済みの文言を返す | 正常系 |
| 3 | provider-mismatch ならプロバイダ不一致の文言を返す | 正常系 |
| 4 | 未知の code（Auth.js 標準エラー等）・空文字ならデフォルト文言を返す | 境界値 |

## pickVerifiedPrimaryEmail

対象: `lib/sso-login.ts` / テスト: `lib/sso-login.test.ts`
概要: GitHub の /user/emails レスポンスから「確認済み（verified）かつプライマリ」のメールのみを採用する
前提: モックなし（純粋関数）

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | verified かつ primary のメールを返す | 正常系 |
| 2 | primary だが未検証（verified=false）しかなければ null を返す | 異常系 |
| 3 | 配列でない・空配列なら null を返す | 境界値 |

## resolveSsoLogin

対象: `lib/sso-login.ts` / テスト: `lib/sso-login.test.ts`
概要: SSO ログインの事前登録照合。未登録・退職済み・プロバイダ不一致（初回プロバイダ固定）を判定する
前提: `vi.mock` で Prisma をモック

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | email が取得できなければ not-registered を返す（DB 照合しない） | 異常系 |
| 2 | 該当する User がなければ not-registered を返す | 異常系 |
| 3 | 退職済みの社員なら retired を返す | 異常系 |
| 4 | 別プロバイダで紐付き済みなら provider-mismatch を返す | 異常系 |
| 5 | 紐付きがなければ初回ログインとして ok を返す | 正常系 |
| 6 | 同一プロバイダで紐付き済み（2回目以降）なら ok を返す | 正常系 |
| 7 | メールは小文字化して照合する | 正常系 |

## findDevLoginUser

対象: `lib/dev-login.ts` / テスト: `lib/dev-login.test.ts`
概要: 開発用ログインで社員番号から User を照合し、ログイン可否とユーザー情報を返す
前提: `vi.mock` で Prisma をモック

| No | 確認観点 | 分類 |
|---|---|---|
| 1 | employeeId が未入力（undefined・空文字）なら EMPTY_EMPLOYEE_ID を返す | 異常系 |
| 2 | 該当する User がなければ NOT_REGISTERED を返す | 異常系 |
| 3 | 退職済みの社員なら RETIRED を返す | 異常系 |
| 4 | 現職の社員ならユーザー情報を返す | 正常系 |
| 5 | employee.name が未設定なら employeeId を name として返す | 境界値 |
