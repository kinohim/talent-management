# 実行計画: MST002(資格マスタ管理)

## Context

MST004(部署マスタ管理)・MST001(スキルマスタ管理)に続き、合意した実装順序でマスタ管理系の3画面目としてMST002(資格マスタ管理)に着手した。`certification`/`certification_category`マスタを管理職が登録・編集・削除する画面。

MST002はMST001とほぼ同じ構造(カテゴリ選択/新規入力+名称+一覧・編集・削除)だが、スキルにあった「バージョン」のようなサブリストが無く、代わりに「認定団体」という必須テキスト項目を持つ点が異なる。MST001実装時に共通化した`lib/auth-guards.ts`(`requireManager`)・`lib/prisma-errors.ts`(P2002判定)・`components/master/CategorySelectField.tsx`(カテゴリ選択/新規入力の共通UI)をそのまま再利用し、新規に書いたのはMST002固有の部分のみ。

## 実装ファイル

### 新規
- `app/(authenticated)/master/certifications/page.tsx`: MANAGER専用。カテゴリ一覧・資格一覧(カテゴリ別)を取得し`CertificationMasterManager`へ渡す(MST001の`skills/page.tsx`と同型)
- `app/(authenticated)/master/certifications/actions.ts`: `saveCertification(certificationId: number | null, prevState, formData)`(create/update共通)・`deleteCertification(certificationId)`
- `components/master/CertificationMasterManager.tsx`: 追加フォーム+カテゴリ別一覧のルート("use client"。MST001の`SkillMasterManager.tsx`からバージョン関連を除いた構造)
- `components/master/CertificationMasterRow.tsx`: 行の表示/編集/削除("use client"。`SkillMasterRow.tsx`と同型、認定団体フィールドを追加、バージョン関連を除去)
- `lib/certification-master-schema.ts` + テスト: カテゴリ名/資格名/認定団体のzodバリデーション、`parseCertificationMasterForm`
- `lib/certification-master.ts` + テスト: `getCertificationDeleteBlockReason(certificationId)`(`EmployeeCertification.certificationId`のcountのみ。MST001の`getSkillDeleteBlockReason`より単純、子テーブルが無いため)

### 変更
- `app/(authenticated)/master/page.tsx`: `MASTER_TILES`の`certifications`エントリに`href: "/master/certifications"`を追加
- `lib/breadcrumbs.ts`: `"/master/certifications"`エントリを追加

### 再利用(変更なし)
- `lib/auth-guards.ts`の`requireManager()`
- `lib/prisma-errors.ts`の`isUniqueConstraintViolation()`
- `components/master/CategorySelectField.tsx`
- `components/ui/ConfirmDialog.tsx`(CMN001)

## 設計判断

1. **資格名の重複ハンドリング**: `certification_name`はPrismaスキーマに`@unique`があるため、重複作成時はP2002が飛ぶ。`isUniqueConstraintViolation`で判定し「既に登録されている資格名です。」を返す。
2. **削除時の参照チェック**: MST001のskillと違いバージョンのような子テーブルが無いため、`EmployeeCertification.certificationId`のcountのみで判定する単純な構造にした。削除は`certification`単体の論理削除のみ(カスケード削除不要)。
3. **新規カテゴリ入力時の重複について**: `certification_category`にunique制約は無く、`docs/decisions.md`にも重複禁止の記述が無いため、「新規入力」は常に新規作成する(既存同名カテゴリへの自動統合はしない)。カテゴリ自体の一覧・削除UIはMST002の画面仕様に含まれないため実装しない。
4. **保存方式**: MST001/MST004同様`revalidatePath`で同一画面に留まる。

## 検証方法

- `npm run verify`(prisma generate → ESLint → tsc --noEmit → vitest 199件)
- Playwright(開発用ログイン、管理職`000001`)で以下を確認:
  1. トップ→マスタ管理→資格マスタ管理と辿れ、パンくず・戻る導線が機能する
  2. 新規カテゴリで資格を追加(資格名・認定団体を入力)できる
  3. 既存カテゴリからの資格追加ができる
  4. 資格名の重複登録で「既に登録されている資格名です。」が表示される
  5. 参照されていない資格の削除に成功する
  6. 参照されている資格(EDT004で一時的に登録して検証)の削除がブロックされ「使用中のため削除できません」が表示される
  7. 一般社員での直接アクセスがトップへリダイレクトされる

## Critical Files

- `app/(authenticated)/master/certifications/page.tsx`, `actions.ts`
- `components/master/CertificationMasterManager.tsx`, `CertificationMasterRow.tsx`
- `lib/certification-master.ts`, `lib/certification-master-schema.ts`

---

## 実装結果(実施済み)

上記プラン通りに実装した。仕様(docs/screens.md)との差異はなし。

### 検証結果

`npm run verify`(lint・tsc・vitest 199件)が通過。Playwrightで以下をすべて確認した。

1. トップ→マスタ管理→資格マスタ管理のパンくず・戻る導線が正しく機能した
2. 新規カテゴリ「ビジネス系」+資格名「ビジネス実務法務検定」+認定団体「東京商工会議所」で追加でき、フォームもリセットされた
3. 既存カテゴリ「IT系」等が選択肢に反映されていることを確認した
4. 「TOEIC」の重複登録を試み「既に登録されている資格名です。」が表示された
5. 未参照の「ビジネス実務法務検定」の削除に成功した
6. 参照済みの「TOEIC」(EDT004で一時的に登録して検証)の削除を試みると「使用中のため削除できません」が表示され、削除がブロックされた
7. 一般社員(`000002`)での`/master/certifications`直接アクセスがトップへリダイレクトされた(セッション切替前の自動リダイレクトで確認)

検証用に一時登録した管理職(`000001`)のTOEIC資格登録は、確認後に削除して後片付けした。
