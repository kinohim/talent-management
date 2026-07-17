# 013 resume-detail 経歴書詳細

## 目的

経歴書の全項目を表示する閲覧専用画面を提供し、mypageの閲覧表示と表示コンポーネントを共通化する(docs/screens.md resume-detail)。

## 前提(依存するplan)

- 008 mypage 私の経歴書(セクション骨格)
- 009 経歴概要・自己PR登録
- 010 スキル登録
- 011 資格登録
- 012 project-form プロジェクト経歴登録
(表示対象のデータ入力手段一式)

## 実装内容

- `app/(authenticated)/resumes/[employeeId]/page.tsx`: 経歴書詳細
  - 表示項目は docs/screens.md resume-detail の表のとおり(基本情報・最終学歴・経歴概要・自己PR・スキル(カテゴリ別ピル+凡例)・資格(取得年月日「YYYY年M月D日」・資格名・認定団体)・プロジェクト経歴の繰り返し)
  - 経験年数は「◯年◯か月」の月精度表示(端数のない側は省略)
  - 所属組織は「事業部 / 部署 / Gr」の連結表示(`formatOrganizationUnitPath`)
  - 画面右上に「PDF出力」ボタン(pdf-previewへ。人事・営業/管理職または本人のとき表示。022参照)
- 表示コンポーネントは`components/resumes/`に置き、mypage[表紙]タブの閲覧表示と共用する
- アクセス制御(`lib/organization-unit.ts`の`canViewEmployeeResume`+単体テスト):
  - 本人・人事・営業・管理職は常に閲覧可
  - 一般社員が他社員を見る場合は閲覧範囲判定(`isWithinResumeViewScope`: 部署一致、事業部直下が絡む場合は事業部一致、未所属は対象外。docs/screens.md resume-listの判定ルール)
  - 対象が`is_registered=false`・論理削除済み・存在しない場合はトップへリダイレクト
- 戻り導線は「経歴書一覧に戻る」に一本化(本人・他人を問わず同じ)

## 受け入れ基準

- 全セクションが仕様どおり表示され、編集ボタンが存在しない
- 閲覧範囲判定ルール(a)(b)(c)がURL直打ちでも機能する
- `is_registered=false`の社員はURL直打ちでも表示されない

## 検証方法

1. `lib/organization-unit.test.ts`で閲覧範囲判定(部署一致・事業部直下・未所属・ロール別)を網羅する
2. Playwrightで一般社員による閲覧可/不可の両ケースとリダイレクトを確認する
3. `npm run verify`が通ることを確認する
