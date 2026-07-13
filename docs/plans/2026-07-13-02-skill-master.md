# 実行計画: MST001(スキルマスタ管理)

## Context

MST004(部署マスタ管理)に続き、合意した実装順序(マスタ管理系 → アカウント管理系 → REF002 → REF008 → REF005)のうちマスタ管理系の残り4画面(MST001スキル・MST002資格・MST003現場ポジション・MST005現場)に着手した。4画面まとめて方針を検討したうえで、実装・検証・コミットは1画面ずつ進める方針で合意し、まずMST001を実装した(MST002/003/005は後続で同じ方針を使って実装する)。

MST001は`skill`/`skill_category`/`skill_version`マスタを管理職が登録・編集・削除する画面。スキル名はシステム全体でユニーク、バージョンは複数登録可能(`docs/decisions.md`)。他のマスタ画面(MST002/003/005)にも共通する構造(名前ユニーク・他テーブルから参照されていれば削除不可)のため、共通ヘルパーをこの実装で切り出した。

## 実装ファイル

### 新規
- `app/(authenticated)/master/skills/page.tsx`: MANAGER専用。カテゴリ一覧・スキル一覧(カテゴリ別・アクティブなバージョンのみ)を取得し`SkillMasterManager`へ渡す
- `app/(authenticated)/master/skills/actions.ts`: `saveSkill`(create/update共通)・`deleteSkill`
- `components/master/SkillMasterManager.tsx`: 追加フォーム+カテゴリ別一覧のルート("use client")
- `components/master/SkillMasterRow.tsx`: 行の表示/編集/削除("use client"。MST004の`OrganizationUnitNodeItem.tsx`から階層部分を除いた構造)
- `components/master/CategorySelectField.tsx`: 「カテゴリ選択(既存)/新規入力」の共通フィールド(MST002でも再利用予定)
- `components/master/VersionTagEditor.tsx`: バージョンのタグ追加/削除UI。チップ+`<input type="hidden" name="versionNames">`を複数レンダーし`FormData.getAll`で回収
- `lib/skill-master-schema.ts` + テスト: カテゴリ名/スキル名/バージョン名のzodバリデーション、`parseSkillMasterForm`
- `lib/skill-master.ts` + テスト: `getSkillDeleteBlockReason`(削除時参照チェック)、`planSkillVersionDiff`(バージョンdiffの純粋ロジック)、`isSkillVersionReferenced`
- `lib/auth-guards.ts` + テスト: `requireManager()`(MST004の`organization-units/actions.ts`からの切り出し、全マスタ画面で共有)
- `lib/prisma-errors.ts` + テスト: `isUniqueConstraintViolation`(P2002判定)

### 変更
- `app/(authenticated)/master/organization-units/actions.ts`: ローカル定義していた`requireManager`を`lib/auth-guards.ts`からのimportに置き換え(挙動変更なし)
- `app/(authenticated)/master/page.tsx`: `MASTER_TILES`の`skills`エントリに`href: "/master/skills"`を追加
- `lib/breadcrumbs.ts`: `"/master/skills"`エントリを追加

## 設計判断

1. **バージョンタグの削除挙動(ユーザー確認済み: 参照有無で自動判定)**: 編集時にバージョンタグを外すと、`EmployeeSkill.skillVersionId`/`ProjectSkill.skillVersionId`から参照されていなければ物理削除、参照されていれば`skill_version.is_active = false`に更新して非表示化する。保存時のdiff(`planSkillVersionDiff`)は、送信タグ名が既存バージョン(active/inactive問わず)と一致すれば再表示化(新規重複作成を避ける)、一致しなければ新規作成、既存activeで送信タグに含まれないものを削除候補とする。削除候補は参照有無をトランザクション実行前に確認し、結果に応じて物理削除/非表示化を分岐する。
2. **skill削除時、skillVersionのis_activeは更新しない**: `deleteSkill`はskillと配下skillVersionに`deletedAt`をセットするのみで`isActive`は変更しない。読み取り側(`lib/skill-options.ts`のEDT003/EDT005選択肢取得、MST001の`page.tsx`)は必ず`skill.deletedAt: null`でスキル自体を絞り込んでから配下バージョンを見るため、スキルが削除されればその配下バージョンの`isActive`値を参照する経路が残らない。`isActive`は「スキルが生きている状態で特定バージョンだけ新規選択肢から外す」ためのフラグで、`deletedAt`(論理削除)とは別軸のため、skill削除時に触れる必要がない。
3. **新規カテゴリ入力時の重複について**: `skill_category`にunique制約は無く、`docs/decisions.md`にも重複禁止の記述が無いため、「新規入力」は常に新規作成する(既存同名カテゴリへの自動統合はしない)。カテゴリ自体の一覧・削除UIはMST001の画面仕様に含まれないため実装しない。
4. **ユニーク制約違反のハンドリング**: `skill_name`はPrismaスキーマに`@unique`があるため、重複作成時はP2002が飛ぶ。`lib/prisma-errors.ts`の`isUniqueConstraintViolation`で判定し「既に登録されているスキル名です。」を返す。
5. **保存方式**: MST004同様`revalidatePath`で同一画面に留まる(EDT系のような`redirect`はしない)。

## 検証方法

- `npm run verify`(prisma generate → ESLint → tsc --noEmit → vitest 189件)
- Playwright(開発用ログイン、管理職`000001`)で以下を確認:
  1. トップ→マスタ管理→スキルマスタ管理と辿れ、パンくず・戻る導線が機能する
  2. 新規カテゴリ+バージョンタグ2件付きでスキルを追加できる(フォームもリセットされる)
  3. 既存カテゴリからのスキル追加ができる
  4. 未参照バージョンの削除は物理削除、参照済みバージョン(EDT003で一時的にJava 8を登録して検証)の削除は`is_active=false`への更新になることをDBで確認
  5. スキル名の重複登録で「既に登録されているスキル名です。」が表示される
  6. 参照されていないスキルの削除に成功する
  7. 一般社員での直接アクセスがトップへリダイレクトされる

## Critical Files

- `app/(authenticated)/master/skills/page.tsx`, `actions.ts`
- `components/master/SkillMasterManager.tsx`, `SkillMasterRow.tsx`, `CategorySelectField.tsx`, `VersionTagEditor.tsx`
- `lib/skill-master.ts`, `lib/skill-master-schema.ts`
- `lib/auth-guards.ts`, `lib/prisma-errors.ts`

---

## 実装結果(実施済み)

上記プラン通りに実装した。仕様(docs/screens.md)との差異はなし。

### 検証結果

`npm run verify`(lint・tsc・vitest 189件)が通過。Playwrightで以下をすべて確認した。

1. トップ→マスタ管理→スキルマスタ管理のパンくず・戻る導線が正しく機能した
2. 新規カテゴリ「インフラ」+バージョンタグ「1.28」付きで「Kubernetes」を追加でき、フォームもリセットされた
3. 既存カテゴリ「プログラミング言語」から新規スキル追加できることを確認した
4. バージョンタグ削除の挙動: 未参照の「Kubernetes/1.28」は削除後DBから物理削除されていること、参照済みの「Java/8」(EDT003で一時的に登録して検証)は削除後も行が残り`isActive: false`に更新されていることをDBで直接確認した
5. 「Python」の重複登録を試み「既に登録されているスキル名です。」が表示された
6. 未参照の「Kubernetes」の削除に成功した
7. 一般社員(`000002`)での`/master/skills`直接アクセスがトップへリダイレクトされた

検証用に一時登録した管理職(`000001`)のJavaスキル(バージョン8)は、確認後に削除して後片付けした。
