# 017 master-project-roles 現場ポジションマスタ管理

## 目的

プロジェクト経歴で選択する役割(SE・PG・リーダー等)を管理職が管理できるようにする(docs/screens.md master-project-roles)。

## 前提(依存するplan)

- 014 master-org-units 部署マスタ管理(マスタ管理ハブ)

## 実装内容

- `app/(authenticated)/master/project-roles/page.tsx`+`actions.ts`: master-project-roles
  - 画面最上部の「役割を追加」コンパクトな1行フォーム(20文字・システム全体でユニーク)
  - 一覧は「名称は左、[編集][削除]ボタンは右端」の統一配置
  - 削除はconfirm-dialogで確認。`project_role_link`から参照中なら「使用中のため削除できません」(`lib/project-role-master.ts`)
  - 同名の論理削除済み役割の復活に対応する

## 受け入れ基準

- 追加・名称変更・削除が仕様どおり動く
- 参照中役割の削除がブロックされ、削除済み同名の再登録が復活として動く

## 検証方法

1. `lib/project-role-master.test.ts`で参照判定を網羅する
2. Playwrightで追加・編集・削除の一連を確認する
3. `npm run verify`が通ることを確認する
