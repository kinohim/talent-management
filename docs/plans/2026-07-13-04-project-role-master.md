# 実行計画: MST003(現場ポジションマスタ管理)

## Context

MST004(部署マスタ管理)・MST001(スキルマスタ管理)・MST002(資格マスタ管理)に続き、マスタ管理系の4画面目としてMST003(現場ポジションマスタ管理)に着手した。`project_role`マスタ(役割名のみ、カテゴリなし)を管理職が登録・編集・削除する画面で、MST001/MST002よりさらに単純な構造。

## 画面仕様(docs/screens.md MST003)

| 項目 | 種別 | 必須 | 内容 |
|---|---|---|---|
| 役割名 | テキスト | 必須 | 20文字以内、システム全体でユニーク |
| 一覧・編集・削除 | 表示＋ボタン | - | 削除はCMN001で確認 |

カテゴリが無いフラットな一覧のみ(MST001/MST002の「カテゴリ選択(既存)/新規入力」は不要)。

## 実装ファイル

### 新規
- `app/(authenticated)/master/project-roles/page.tsx`: MANAGER専用。役割一覧を取得し`ProjectRoleMasterManager`へ渡す
- `app/(authenticated)/master/project-roles/actions.ts`: `saveProjectRole(projectRoleId: number | null, prevState, formData)`・`deleteProjectRole(projectRoleId)`
- `components/master/ProjectRoleMasterManager.tsx`: 追加フォーム(役割名のみ)+一覧のルート("use client")
- `components/master/ProjectRoleMasterRow.tsx`: 行の表示/編集/削除("use client"。`SkillMasterRow.tsx`からカテゴリ・バージョン関連を除いた最小構成)
- `lib/project-role-master-schema.ts` + テスト: 役割名のzodバリデーション(1〜20文字)
- `lib/project-role-master.ts` + テスト: `getProjectRoleDeleteBlockReason(projectRoleId)`

### 変更
- `app/(authenticated)/master/page.tsx`: `MASTER_TILES`の`project-roles`エントリに`href: "/master/project-roles"`を追加
- `lib/breadcrumbs.ts`: `"/master/project-roles"`エントリを追加

### 再利用(変更なし)
- `lib/auth-guards.ts`の`requireManager()`
- `lib/prisma-errors.ts`の`isUniqueConstraintViolation()`
- `components/ui/ConfirmDialog.tsx`(CMN001)

## 設計判断

1. **既存の削除時参照チェックのバグ修正**: 実装中に、`lib/skill-master.ts`の`getSkillDeleteBlockReason`/`isSkillVersionReferenced`が`projectSkill`のcountで`deletedAt`を絞り込んでおらず、`deleteProject`で論理削除されたプロジェクトの残骸まで「使用中」と誤判定してしまうバグを発見・修正した(`ProjectRoleLink`の同型チェックを新規に書くタイミングで発見)。`getProjectRoleDeleteBlockReason`は最初から`deletedAt: null`で絞り込んで実装している。回帰テストを`lib/skill-master.test.ts`に追加した。
2. **保存方式**: 既存マスタ画面と同様`revalidatePath`で同一画面に留まる。
3. **ユニーク制約違反のハンドリング**: `project_role_name`の`@unique`違反(P2002)は`isUniqueConstraintViolation`で捕捉し「既に登録されている役割名です。」を返す。

## 追加バグ修正: 論理削除済みマスタ行と同名での再作成が失敗する問題(MST001/002/003共通)

MST003の動作確認中に、論理削除した役割名を再度追加しようとすると失敗する不具合が見つかった。原因は、`project_role_name`/`skill_name`/`certification_name`のPrisma`@unique`制約が`deleted_at`を考慮しないテーブル全体のDB制約であるため(論理削除されていても行自体は残るので、同名でのINSERTがユニーク制約違反になる)。

MST001(スキル)・MST002(資格)も同じ構造(論理削除+システム全体ユニーク制約)のため同様に発生することを確認し、ユーザーと合意のうえ3画面まとめて修正した(MST004の`organization_unit.unit_name`にはユニーク制約が無いため対象外)。

**修正方針**: 各`saveX`アクションの新規作成分岐で、保存前に同名の**論理削除済み**行(`deletedAt: { not: null }`)が存在するか確認する。存在すれば新規`create`ではなくその行を`update`して`deletedAt`/`deletedBy`/`deletedProgram`を`null`に戻し(復活)、新しい入力値で上書きする。存在しなければ従来通り`create`する。現役(未削除)の同名行との重複は従来通りP2002 →「既に登録されている〇〇名です。」でブロックする。DBスキーマ・マイグレーションの変更は行っていない(アプリケーション層のみの修正)。

**修正ファイル**: `app/(authenticated)/master/skills/actions.ts`(`saveSkill`)、`app/(authenticated)/master/certifications/actions.ts`(`saveCertification`)、`app/(authenticated)/master/project-roles/actions.ts`(`saveProjectRole`)

**ドキュメント追記**: `docs/decisions.md`の「スキル・資格・マスタ全般」節に、この復活挙動を設計判断として追記した。

## 検証方法

- `npm run verify`
- Playwright(開発用ログイン、管理職`000001`)でMST003について以下を確認:
  1. トップ→マスタ管理→現場ポジションマスタ管理と辿れ、パンくず・戻る導線が機能する
  2. 役割を新規追加できる(フォームもリセットされる)
  3. 役割名の重複登録で「既に登録されている役割名です。」が表示される
  4. 参照されていない役割の削除に成功する
  5. 参照されている役割(EDT005で一時的にプロジェクト経歴の役割として登録して検証)の削除がブロックされ「使用中のため削除できません」が表示される
  6. 一般社員での直接アクセスがトップへリダイレクトされる
- 追加バグ修正について、MST001/002/003それぞれで「新規追加→削除→同じ名前で再度新規追加」が成功すること、現役の同名行との重複は引き続きブロックされることを確認

## Critical Files

- `app/(authenticated)/master/project-roles/page.tsx`, `actions.ts`
- `components/master/ProjectRoleMasterManager.tsx`, `ProjectRoleMasterRow.tsx`
- `lib/project-role-master.ts`, `lib/project-role-master-schema.ts`
- `lib/skill-master.ts`(削除時参照チェックのバグ修正箇所)
- `app/(authenticated)/master/skills/actions.ts`, `app/(authenticated)/master/certifications/actions.ts`(論理削除済み行の復活ロジック)

---

## 実装結果(実施済み)

上記プラン通りに実装した。仕様(docs/screens.md)との差異はなし。動作確認の過程で2件のバグを発見・修正した(削除時参照チェックの`deletedAt`絞り込み漏れ、論理削除済み同名行の再作成失敗)。

### 検証結果

`npm run verify`(lint・tsc・vitest 210件)が通過。Playwrightで以下をすべて確認した。

1. トップ→マスタ管理→現場ポジションマスタ管理のパンくず・戻る導線が正しく機能した
2. 「テスター」を新規追加でき、フォームもリセットされた
3. 「SE」の重複登録を試み「既に登録されている役割名です。」が表示された
4. 未参照の「テスター」の削除に成功した
5. 参照済みの「リーダー」(EDT005で一時的にプロジェクト経歴の役割として登録して検証)の削除を試みると「使用中のため削除できません」が表示され、削除がブロックされた(削除時参照チェックのバグ修正が効いていることも確認)
6. 一般社員(`000002`)での`/master/project-roles`直接アクセスがトップへリダイレクトされた

追加バグ修正の検証として、MST001(スキル)・MST002(資格)・MST003(現場ポジション)それぞれで「新規追加→削除→同じ名前で再度新規追加」が成功し、現役の同名行との重複は引き続き「既に登録されている〇〇名です。」でブロックされることを確認した。検証用に一時登録したプロジェクト経歴・スキル・資格・役割はすべて削除して後片付けした。
