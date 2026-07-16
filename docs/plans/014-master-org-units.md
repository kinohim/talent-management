# 014 master-org-units 部署マスタ管理

## 目的

組織単位(事業部＞部署＞Gr)の階層を管理職が画面から管理できるようにする(docs/screens.md master-org-units)。あわせてマスタ管理系画面のハブ(master-home)を作る。

## 前提(依存するplan)

- 003 共通レイアウト・UI部品(confirm-dialog)
- 006 home トップ(マスタ管理タイルからの導線)

## 実装内容

- `app/(authenticated)/master/page.tsx`: master-home マスタ管理ハブ(master-*の5マスタ画面へのタイル。管理職のみ)
- `app/(authenticated)/master/organization-units/page.tsx`+`actions.ts`: master-org-units
  - 初期表示は事業部のみ。行頭の▶/▼で配下を展開し、閉じている行には配下件数(「部署3件」等)を表示
  - 画面最上部に「事業部を追加」のコンパクトな1行フォーム(unit_level=division, parent_id=NULL)
  - 各行は「名称は左、[編集][配下に追加][削除]は右端」。「配下に追加」は直下階層を追加し追加後に自動展開(Gr行には非表示)
  - 同名チェック: 同一親の配下内で一意(アプリ側チェック)。重複時は「同じ階層に同名の組織単位が既に存在します。」
  - 削除: 配下の子・所属社員・現場マスタの主管部署としての参照のいずれかがあれば「使用中のため削除できません」(`getOrganizationUnitDeleteBlockReason`。いずれも未削除の行のみをカウント)。削除はconfirm-dialogで確認し論理削除
- 全マスタ画面共通のアクセス制御: ページ側のロール判定とServer Action側の`requireManager`の二段で保護し、管理職以外はリダイレクト

## 受け入れ基準

- 3階層の追加・名称変更・削除・開閉表示が仕様どおり動く
- 同名チェックが「同一親の配下内」でのみ効く(別親なら同名可)
- 削除ブロック3条件がそれぞれ機能する

## 検証方法

1. `lib/organization-unit.test.ts`(削除ブロック)・actionsのテストで同名チェックを網羅する
2. Playwrightで事業部追加→配下に追加→削除ブロック→削除の一連を確認する
3. `npm run verify`が通ることを確認する
