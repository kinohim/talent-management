# UI改修 第2ラウンド(一覧改善・アカウント編集拡張・重複チェック・私の経歴書調整) 実装計画

## Context

「私の経歴書」大改修(2026-07-14-03)に対するユーザーレビュー第2弾。
一覧UIの仕上げ、アカウント編集での社員ID/メール変更、マスタの同名重複バグ修正、私の経歴書の編集UX調整を実施した。

確認済みの決定事項:

- 組織単位名の一意性は同一親の配下内(兄弟間のみ重複禁止)
- 社員ID/メール変更は警告文の常時表示+変更保存時に確認ダイアログ(CMN001)
- 現場検索は単一選択のみに変更

## 調査で判明した重要事実

- `employee.employee_id` への FK(user/employee_skill/employee_certification/project)は全て ON UPDATE CASCADE 済み → 社員ID変更はDBレベルで安全に伝播する
- SSOログインの照合キーは `users.email`(毎回動的照合、`lib/sso-login.ts`)→ メールを誤った値にすると対象者がログイン不能
- 監査カラム(created_by等)はFKなしの文字列 → 社員ID変更後も旧IDのまま残る(仕様上許容)
- セッション: 本番(database戦略)は次リクエストで新IDに追随。開発(JWT)は再ログインまで旧IDが残る
- `OrganizationUnit.unitName`・`SkillCategory.skillCategoryName`・`CertificationCategory.certificationCategoryName` はDB・アプリともユニークチェックなし(既存のP2002 catchと復活ロジックは存在しない制約を前提にした空振り状態)
- ヘッダフィルタのポップオーバーはテーブルラッパの `overflow-x-auto` にクリップされ、結果行が少ないと見切れる

## 1. 経歴書一覧 (REF002)

対象: `components/resumes/ResumeFilterForm.tsx`, `ResumeSearchResultTable.tsx`, `components/ui/DataTableHeaderCell.tsx`, `lib/resume-search.ts`(+test), `app/(authenticated)/resumes/page.tsx`

- 現場検索を単一選択に: `siteIds: number[]` → `siteId: number | null`。フォームは単一コンボボックス(input+datalist、選択済みpill+×クリア)
- 検索フォームの配置再考: 上段グリッド(①氏名カナ+経験年数+退職者 ②所属組織 ③現場)+下段グリッド(スキル条件 | 取得資格条件 を横並び)
- 資格も一覧に表示: select に `employeeCertifications` を追加し「主な資格」列(distinct→上位3件+「…」。整形は `summarizeNames` に共通化)
- スキル/資格のヘッダフィルタを検索項目と同仕様に: `DataTableHeaderCell` に新フィルタ型 `tagCondition`(サジェスト入力+選択済みタグ+AND/ORラジオ)。searchParams は `colSkillId`+`colSkillMode`、`colCertificationId`+`colCertificationMode`。テキスト絞込 `colSkill` は廃止
- ポップオーバーの見切れ修正: `position: fixed` 化(開いた時にボタン位置から算出、右端はみ出しは左寄せ補正)。さらに描画後に `useLayoutEffect` で実高さを測り、画面下端をはみ出す場合は上方へ補正。スクロール/リサイズ時は閉じる

## 2. アカウント編集 (EDT007): 社員ID・メールアドレスの変更

対象: `components/accounts/EditAccountForm.tsx`, `lib/account-schema.ts`(+test), `app/(authenticated)/accounts/actions.ts`

- 社員ID(6桁)とメールアドレスを入力欄に変更し、それぞれ警告文を常時表示(社員ID: 開発用ログインは新IDで再ログイン/メール: SSO照合キーのため不一致でログイン不能)
- 変更検知時のみ ConfirmDialog(CMN001)で変更内容(旧→新)を提示して保存
- `parseEditAccountForm` に employeeId/email を追加(新規登録と同じスキーマを再利用)
- `updateAccount`: トランザクションで employee.update(employeeId変更→FKはCASCADEで追随)→ user.update(where は新ID)。unique違反は `DUPLICATE_EMPLOYEE_ID`/`DUPLICATE_EMAIL` ハンドリングを流用

## 3. マスタの同名重複チェック

- 部署(同一親の配下内で一意): `createOrganizationUnit`/`renameOrganizationUnit` にアプリ側の事前チェック(`siblingNameExists`)。重複時「同じ階層に同名の組織単位が既に存在します。」。DB制約は追加しない(親NULLの兄弟一意はPrismaで表現できず、管理職のみの低頻度操作のため)
- スキル/資格カテゴリ(各マスタ内で一意): migration `make_category_names_unique` で両カテゴリ名に UNIQUE を追加(db-migrationスキル手順に従い実施。適用前にDB上の重複「IT系」id=13(資格0件のテストデータ)をユーザー承認のうえ物理削除)。`createSkillCategory`/`createCertificationCategory` に有効同名の事前チェック、`saveSkill`/`saveCertification` の新規カテゴリ作成経路にも同チェック+削除済み同名の復活処理を追加

## 4. 私の経歴書 (REF004)

- 基本情報の位置ずれ最小化: `BasicInfoForm` を閲覧表示(ResumeBasicInfoSection/ResumeEducationSection)と同じ2列グリッド・同じ項目順に再構成([氏名|カナ][生年月日|性別][所属組織|最寄駅]→「最終学歴」見出し→[学校種別|学校名][学部・学科名|卒業年月][卒業状況])。社員ID/メール(編集不可)は末尾へ移動、`max-w-2xl` を撤去
- 経歴概要・自己PRの横並び: `CareerSummaryForm` を各項目「登録用textarea | ←ボタン | AI生成フォーム」の3カラム(md以上)に再配置(`FieldWithAiPanel`)。`AiGeneratePanel` は生成結果を controlled 化(`value`/`onValueChange`)し、←(反映)ボタンを親側の中央カラムへ移動

## docs 更新

- `docs/screens.md`: REF002(現場単一・フォーム配置・主な資格列・タグ絞込・ポップアップの画面基準表示)、EDT007(社員ID・メール編集+安全策)、MST001/002/004(同名チェック)
- `docs/schema.md`: unit_name(同一親内一意)/カテゴリ名(各マスタ内一意・UK)
- `docs/decisions.md`: 「アカウント・マスタの整合性」節を追加(社員ID/メール変更の判断と懸念、一意範囲の判断)

## 検証

- `npm run verify` 全項目パス(39ファイル・337テスト)
- Playwright で実機確認: 検索結果1件でのポップオーバー全体表示、資格タグ絞込の適用(URL反映・0件時もヘッダ維持)、メール変更時の確認ダイアログ(変更内容表示)、同名事業部/カテゴリ登録のエラー表示、基本情報の編集/閲覧レイアウト整合、AI生成フォームの横並び。コンソールエラーなし
