# スキーマ定義

全19テーブル。実装は `prisma/schema.prisma`(モデル名はPascalCase、`@@map`/`@map`でsnake_caseのテーブル名・カラム名に対応)。

## 命名・型の共通規則

- テーブル名・カラム名はスネークケース。
- **サロゲートキーのPKはカラム名 `id`(SERIAL)で統一する**。例外は `users` のみ(Auth.jsアダプタの要件でTEXT/cuid)。
- FKカラム名は `<参照先テーブル名>_id`(例: `skill_id` は `skill.id` を参照)。ただし `employee` へのFKは、サロゲートキー `employee.id` ではなく業務上の社員ID `employee.employee_id`(VARCHAR(6)、UNIQUE)を参照する。FK値を人間可読にするため(docs/decisions.md「命名規則」参照)。
- 区分値はPostgreSQLのネイティブENUM型で実装し、格納値は英語のsnake_case(例: `employment_status` は `active` / `retired`)。

## 全テーブル共通のシステムカラム

以下9カラムを全テーブルが持つ(各テーブル定義では省略)。例外は `accounts` / `sessions` / `verification_tokens` の3テーブルで、システムカラムを一切持たない(該当節参照)。また `users` のみ `created_by` / `created_program` / `updated_by` / `updated_program` がNULL可(該当節参照)。

```
created_at, created_by, created_program,
updated_at, updated_by, updated_program,
deleted_at, deleted_by, deleted_program   -- 論理削除。NULL=有効、日付あり=削除済
```

- `created_by` / `updated_by` / `deleted_by` は操作者の `employee_id` を保持する VARCHAR(6)。監査目的のカラムであり、`employee` への外部キー制約は張らない。
- `created_program` / `updated_program` / `deleted_program` は操作元の画面ID等を記録する VARCHAR(50)。

---

## organization_unit（組織単位マスタ：事業部／部署／Gr）

自己参照テーブルで3階層(事業部＞部署＞Gr)を表現する。社員はいずれの階層にも所属できる。

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| parent_id | INT | FK→organization_unit.id, NULL可 | 事業部の場合はNULL |
| unit_name | VARCHAR(100) | NOT NULL | 例：システム事業部、開発部、第一Gr。同一親の配下内で一意(アプリ側チェック。別の親の配下なら同名可) |
| unit_level | ENUM | NOT NULL | division:事業部, department:部署, group:Gr |

- 事業部(division)はMST004画面の専用フォームからのみ追加できる。部署・Gr(department/group)は一覧の該当行から「配下に追加」して作成する。
- 削除は次のいずれかの参照が残っている間は不可(「使用中のため削除できません」): 配下の子組織、所属社員(`employee.organization_unit_id`)、主管部署として参照する現場(`site.organization_unit_id`)。

---

## employee（社員基本情報）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | サロゲートキー。他テーブルからは参照されない(FKは`employee_id`を使う) |
| employee_id | VARCHAR(6) | UK, NOT NULL | 管理職が新規登録時に採番。他テーブルのFK参照先 |
| is_registered | BOOLEAN | NOT NULL, DEFAULT FALSE | 初期登録完了フラグ。EDT001完了でTRUEに更新。人事・営業はEDT001を通らないため初回ログイン成立時に自動でTRUE |
| employment_status | ENUM | NOT NULL, DEFAULT active | active:現職, retired:退職。**退職判定はこのカラムで行う**(論理削除の`deleted_at`とは別軸) |
| organization_unit_id | INT | FK→organization_unit.id, NULL可 | 事業部／部署／Grいずれかの行を指す(最下層の選択値を保存) |
| name | VARCHAR(50) | NULL可 | 初期登録前はNULL。人事・営業は初回SSOログイン時にプロバイダの表示名を自動補完(設定済みなら上書きしない) |
| name_kana | VARCHAR(50) | NULL可 | 初期登録前はNULL |
| birth_date | DATE | | |
| gender | ENUM | | male:男性, female:女性, other:その他 |
| experience_months | INT | | プロジェクト経歴の登録・更新・削除時に自動計算して保存。**全プロジェクト期間の和集合**(重複期間は1回として数える)の月数(区間は開始月・終了月の両端を含む)。`end_date=NULL`(進行中)は計算時点の年月(JST基準)まで含める。年へは切り捨てず月数のまま保存し、表示は「◯年◯か月」(REF003/REF004)、一覧・検索は12で割った年数で扱う |
| career_summary | TEXT | | 経歴概要 |
| self_pr | TEXT | | 自己PR |
| nearest_station_line | VARCHAR(100) | | 自由記述。例：JR山手線 |
| nearest_station_name | VARCHAR(100) | | 自由記述。例：渋谷駅 |
| final_school_name | VARCHAR(100) | | 自由記述 |
| final_department_name | VARCHAR(100) | | 自由記述(学部・学科名) |
| final_school_type | ENUM | | high_school:高校, vocational_school:専門学校, junior_college:短大, university:大学, graduate_school:大学院 |
| graduation_year_month | DATE | | 年月のみ意味を持つ(1日固定で保存) |
| graduation_status | ENUM | | graduated:卒業, withdrawn:中退 |

---

## users（ログインアカウント）

Auth.js(`@auth/prisma-adapter`)標準の `User` モデルに業務カラム(`employee_id` / `role` / `last_login_at`)を同居させたテーブル。モデル名・テーブル名ともAuth.js標準に合わせる(Prismaモデル名 `User`、`@@map("users")`。テーブル名が複数形なのはAuth.js公式ドキュメントの推奨命名に準拠した例外)。

他テーブルと異なる例外が2つある(理由はdocs/decisions.md「認証」参照):

- **`id` はSERIALではなくTEXT(cuid)**。Auth.jsアダプタの要件。
- **`created_by` / `created_program` / `updated_by` / `updated_program` がNULL可**。監査カラムが設定されるのはEDT006(管理職による事前登録)実行時のみで、Auth.js自身による更新(ログイン時の`emailVerified`更新等)は監査情報を持たないため。

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | TEXT | PK | cuid |
| employee_id | VARCHAR(6) | FK→employee.employee_id, UK, NOT NULL | 1社員1アカウント |
| email | VARCHAR(100) | UK, NOT NULL | 会社メールアドレス。管理職が事前登録し、SSOログイン時の照合キーとして使う(プロバイダ問わず)。照合は小文字化して行う |
| email_verified | TIMESTAMP | NULL可 | Auth.js標準カラム |
| name | VARCHAR(100) | NULL可 | Auth.js標準カラム。SSOの表示名 |
| image | VARCHAR(255) | NULL可 | Auth.js標準カラム。未使用 |
| role | ENUM | NOT NULL | employee:一般社員, hr_sales:人事・営業, manager:管理職 |
| last_login_at | TIMESTAMP | NULL可 | ログイン成功のたびに更新(REF007「最終ログイン」列) |

**ログイン判定ロジック**(`lib/auth.ts` の signIn コールバック → `lib/sso-login.ts`):

1. SSOプロバイダで認証し、**確認済み(verified)メールアドレス**を取得する(GitHubは標準プロバイダがverifiedを確認しないため、userinfoを差し替えて「確認済みかつプライマリ」のメールだけを採用)。確認済みメールが取得できなければ「未登録」エラー
2. そのメールアドレス(小文字化)で `users.email` を検索。該当なし → 「未登録」エラー
3. 該当employeeが `employment_status = retired` → 「無効化済み」エラー
4. 紐付き済みの `accounts` があり、今回のプロバイダと1つも一致しない → 「プロバイダ不一致」エラー(初回に使ったプロバイダに固定。途中でのプロバイダ変更は非対応)
5. 上記を通過したらログイン成立。`accounts` が空なら今回のプロバイダで自動的に紐付ける(初回ログイン。`allowDangerousEmailAccountLinking` を有効にしているが、上記1〜4の事前照合とセットで安全性を担保している)
6. ログイン成立時: `last_login_at` を更新。人事・営業は経歴書を作成しない(EDT001を通らない)ため、`employee.is_registered` を自動でTRUEにし、`employee.name` が未設定ならSSOの表示名で補完する
7. 遷移先: 一般社員／管理職は `is_registered=false` ならEDT001(初回登録)へ、trueならREF001(トップ)へ。人事・営業は常にREF001へ

実SSOプロバイダとして実装済みなのはGitHubのみ(Azure AD／Googleは未実装のTODO)。このほか開発専用のCredentialsプロバイダ `dev-employee-id`(社員IDのみでログイン)があり、非本番環境または `ENABLE_DEV_LOGIN=true` の環境でのみ有効になる。セッション戦略は開発用ログイン有効時はjwt、無効時(本番)はdatabase(Credentialsプロバイダがjwt戦略でしか動作しないため。docs/decisions.md「認証」参照)。

## accounts / sessions / verification_tokens（Auth.jsセッション管理テーブル）

`@auth/prisma-adapter` 標準スキーマ(テーブル名も複数形でAuth.js標準に合わせる)。**システムカラム(created_at等)を持たない**(Auth.jsアダプタが直接read/write/hard-deleteするシステム管理テーブルのため。docs/decisions.md「認証」参照)。

| テーブル | 列名 | 型 | 制約 | 説明 |
|---|---|---|---|---|
| accounts | id | TEXT | PK | cuid |
| accounts | user_id | TEXT | FK→users.id (CASCADE), NOT NULL | |
| accounts | provider | TEXT | NOT NULL | 例: `github` / `dev-employee-id` |
| accounts | provider_account_id | TEXT | NOT NULL | プロバイダ側のユーザーID。(provider, provider_account_id)でUK |
| accounts | その他 | - | - | OAuthトークン等(Auth.js標準。詳細は`prisma/schema.prisma`参照) |
| sessions | id | TEXT | PK | cuid |
| sessions | session_token | TEXT | UK, NOT NULL | |
| sessions | user_id | TEXT | FK→users.id (CASCADE), NOT NULL | |
| sessions | expires | TIMESTAMP | NOT NULL | |
| verification_tokens | identifier | TEXT | NOT NULL | (identifier, token)でUK |
| verification_tokens | token | TEXT | NOT NULL | |
| verification_tokens | expires | TIMESTAMP | NOT NULL | |

---

## skill_category（スキルカテゴリマスタ）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| skill_category_name | VARCHAR(100) | UK, NOT NULL | MST001で管理。certification_categoryとは独立 |

## skill（スキルマスタ）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| skill_category_id | INT | FK→skill_category.id, NOT NULL | |
| skill_name | VARCHAR(100) | UK, NOT NULL | カテゴリをまたいでもシステム全体でユニーク |
| has_version | BOOLEAN | NOT NULL, DEFAULT FALSE | バージョン管理有無。MST001での保存時、バージョンが1件以上あればTRUE、0件ならFALSEに自動設定 |

## skill_version（スキルバージョンマスタ）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| skill_id | INT | FK→skill.id, NOT NULL | |
| version_name | VARCHAR(50) | NOT NULL | 8, 11, 17 等 |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | 選択肢から外す場合はFALSE |
| display_name | VARCHAR(100) | NULL可 | 自動生成: `skill_name + " " + version_name` |

## employee_skill（社員-スキル中間）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| employee_id | VARCHAR(6) | FK→employee.employee_id, NOT NULL | |
| skill_id | INT | FK→skill.id, NOT NULL | |
| skill_version_id | INT | FK→skill_version.id, **NULL可** | NULL=バージョン管理なし |
| skill_level | ENUM | NOT NULL | expert:◎(得意), experienced:○(経験あり), basic:△(基礎知識) |

- 複合ユニーク: `employee_id + skill_id + skill_version_id`(**`UNIQUE NULLS NOT DISTINCT`**)。`skill_version_id=NULL` が「バージョン管理なし」を表し、同じ社員・スキルでNULLは1件のみ許容。Prismaは `NULLS NOT DISTINCT` を表現できないため、migrate生成後にマイグレーションSQLの `CREATE UNIQUE INDEX` を手動修正して適用している(docs/decisions.md参照)。

---

## certification_category（資格カテゴリマスタ）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| certification_category_name | VARCHAR(100) | UK, NOT NULL | MST002で管理。skill_categoryとは独立 |

## certification（資格マスタ）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| certification_category_id | INT | FK→certification_category.id, NOT NULL | |
| certification_name | VARCHAR(100) | UK, NOT NULL | カテゴリをまたいでもシステム全体でユニーク |
| certification_organization | VARCHAR(100) | NOT NULL | 認定団体。例：IPA |

## employee_certification（社員-資格中間）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| employee_id | VARCHAR(6) | FK→employee.employee_id, NOT NULL | |
| certification_id | INT | FK→certification.id, NOT NULL | |
| acquired_date | DATE | NOT NULL | 取得日 |
| expiration_date | DATE | NULL可 | 有効期限 |

- 同じ資格を再取得した場合は新規レコードとして追加する(更新ではなく追加)。

---

## site（現場マスタ）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| site_name | VARCHAR(100) | UK, NOT NULL | MST005で管理。システム全体でユニーク |
| organization_unit_id | INT | FK→organization_unit.id, NULL可 | 主管部署。部署(unit_level=department)のみ選択可・任意 |

## project（プロジェクト経歴）

**社員1人の経歴レコード**であり、プロジェクトという実体の共有マスタではない。同じ現場・同じ案件に複数人が配属された場合も、社員ごとに別レコードを作成する(現場の共有情報はsiteマスタが担う)。したがってproject_detailとの1対1(UK)は「1つの経歴レコードに業務詳細は1件」という意味であり、複数人配属とは干渉しない。

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| employee_id | VARCHAR(6) | FK→employee.employee_id, NOT NULL | |
| site_id | INT | FK→site.id, NOT NULL | siteマスタから選択 |
| project_title | VARCHAR(100) | NOT NULL | |
| industry | VARCHAR(100) | | 自由記述。例：金融派生商品 |
| project_summary | TEXT | | |
| start_date | DATE | NOT NULL | |
| end_date | DATE | NULL可 | NULL=現在進行中 |
| total_team_size | VARCHAR(100) | | 全体人数。自由記述("約50名"等の幅表現を許容)。画面上の入力上限は20文字(EDT005)。DB側は余裕を持たせている |
| team_size | VARCHAR(100) | | 担当チーム人数。自由記述。同上(画面上限20文字) |

## project_role（現場ポジションマスタ）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| project_role_name | VARCHAR(20) | UK, NOT NULL | SE, PG, リーダー 等。MST003で管理。システム全体でユニーク |

## project_role_link（プロジェクト-役割中間）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| project_id | INT | FK→project.id, NOT NULL | |
| project_role_id | INT | FK→project_role.id, NOT NULL | |

- 複合ユニーク: `project_id + project_role_id`。同一プロジェクトへの同一役割の重複登録を防ぐ。

## project_detail（プロジェクト業務詳細）

projectと**1対1**(1つの経歴レコードにつき業務詳細は1レコード)。1対1を保証するため `project_id` にユニーク制約を付ける。

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| project_id | INT | FK→project.id, **UK**, NOT NULL | 1対1を保証するユニーク制約 |
| overview | VARCHAR(300) | | 業務詳細概要 |
| research_analysis | BOOLEAN | | 調査分析 |
| requirements_definition | BOOLEAN | | 要件定義 |
| basic_design | BOOLEAN | | 基本設計 |
| detailed_design | BOOLEAN | | 詳細設計 |
| development | BOOLEAN | | 製造 |
| testing | BOOLEAN | | テスト |
| operation | BOOLEAN | | 運用 |

## project_skill（プロジェクト-スキル中間）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| project_id | INT | FK→project.id, NOT NULL | |
| skill_id | INT | FK→skill.id, NOT NULL | |
| skill_version_id | INT | FK→skill_version.id, NULL可 | 該当時のみ |

- 複合ユニーク: `project_id + skill_id + skill_version_id`(**`UNIQUE NULLS NOT DISTINCT`**)。employee_skillと同方針で、同一プロジェクトへの同一スキル(同一バージョン)の重複登録を防ぐ。

---

## 命名・制約の一般ルール

- カテゴリマスタ(skill_category, certification_category)は `id` のみをPKとし、区分コード(01, 02...)のような別カラムは持たない。
- スキル名・資格名・現場ポジション名・現場名はいずれもシステム全体でユニーク(カテゴリをまたいでも重複不可)。スキルカテゴリ名・資格カテゴリ名もそれぞれのマスタ内でユニーク(いずれもDB制約)。組織単位名は同一親の配下内で一意(アプリ側チェック)。
- 論理削除(`deleted_at`)は全テーブル共通。物理削除は行わない(Auth.js管理の3テーブルを除く)。社員の退職判定には使わず、`employee.employment_status` を使う。
- **親レコードを論理削除する場合、従属する子レコードも同一トランザクションで論理削除する**(例: projectを削除したら、そのproject_detail・project_skill・project_role_linkも同時に論理削除)。子だけが有効なまま残る「宙に浮いた」状態を作らない。
- **マスタ行(skill・skill_version・certification・site・project_role・organization_unit)は、他レコードから参照されている間は削除不可**。削除操作時は参照の有無をチェックし、参照があればエラー「使用中のため削除できません」を表示する(CMN001参照)。参照がなくなれば削除できる。
