# 016 master-certifications 資格マスタ管理

## 目的

資格カテゴリ・資格(認定団体付き)を管理職が管理できるようにする(docs/screens.md master-certifications)。

## 前提(依存するplan)

- 015 master-skills スキルマスタ管理(同じ画面構成を踏襲)

## 実装内容

- `app/(authenticated)/master/certifications/page.tsx`+`actions.ts`: master-certifications
  - master-skillsと同じ構成: カテゴリ単位の開閉式一覧+最上部の「カテゴリを追加」(資格カテゴリ内で一意)+カテゴリごとの追加ボタン+資格名の絞り込み
  - 資格は資格名(100文字・システム全体でユニーク)+認定団体(100文字・必須)
  - 削除はconfirm-dialogで確認。`employee_certification`から参照中なら「使用中のため削除できません」(`lib/certification-master.ts`)
  - 同名の論理削除済み資格・カテゴリの復活に対応する。復活時はカテゴリ・認定団体を今回の入力値で上書きする(idと作成日時は元の行のまま)

## 受け入れ基準

- カテゴリ・資格の追加・編集・削除・絞り込みが仕様どおり動く
- 参照中資格の削除がブロックされ、削除済み同名の再登録が復活として動き、属性が今回の入力値になる
- スキルカテゴリとは独立に管理される

## 検証方法

1. `lib/certification-master.test.ts`で参照判定を網羅する
2. Playwrightで追加・編集・削除の一連を確認する
3. `npm run verify`が通ることを確認する
