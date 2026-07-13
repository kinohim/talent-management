# 実行計画: MST004(部署マスタ管理)

## Context

22画面中11画面が実装済みで、残り11画面のうち今回合意した実装順序(マスタ管理系 → アカウント管理系 → REF002 → REF008 → REF005)の最初としてMST004(部署マスタ管理)に着手した。

MST004は組織単位(事業部＞部署＞Grの3階層自己参照テーブル`organization_unit`)を管理職が登録・編集・削除する画面で、EDT001(基本情報登録)・REF002(経歴書一覧)・REF007/REF008など他の多くの画面が参照する土台データを整備する位置づけ。現状`organization_unit`へのデータ投入手段は`prisma/seed.ts`の開発用シードしかなく、本画面がリリース後の唯一の投入経路になる(`docs/screens.md` 318行目)。

`components/home/HomeTiles.tsx`の「マスタ管理」タイルは実装前は`href`未設定で未接続だった。`docs/screen-flow.md`ではトップ画面からMST001〜005へ個別に直接遷移する矢印のみが定義されており、マスタ管理の中間ハブ画面は正式な22画面には含まれていない。しかし5画面への導線をどこかで表現する必要があるため、`components/ui/Tile.tsx`(`href`未指定時に自動で「準備中」表示するプレースホルダー機能を既に持つ)を再利用した簡易ハブページ`/master`を設け、実装済みの画面から順にリンクを追加していく方針とした。

## 実装ファイル

### 新規
- `app/(authenticated)/master/page.tsx`: マスタ管理ハブ。MANAGER専用。`Tile`を5つ並べ、MST004実装後は「部署マスタ管理」のみ`href="/master/organization-units"`を設定、残り4つは`href`省略で「準備中」表示のまま(MST001/002/003/005実装時に1つずつ`href`を追加していく)
- `app/(authenticated)/master/organization-units/page.tsx`: MST004本体。Server Component
- `app/(authenticated)/master/organization-units/actions.ts`: Server Actions(`createOrganizationUnit`/`renameOrganizationUnit`/`deleteOrganizationUnit`)
- `components/master/OrganizationUnitManager.tsx`: 事業部追加フォーム+ツリーのルート("use client")
- `components/master/OrganizationUnitNodeItem.tsx`: 1行分の表示(編集/配下に追加/削除)を持つ再帰コンポーネント("use client")
- `lib/organization-unit-schema.ts` + テスト: `unitName`のzodバリデーション、`OrganizationUnitFormState`型
- `lib/organization-unit-tree.ts` + テスト: `buildOrganizationUnitTree`(階層ツリー構築)・`deriveChildLevel`(配下に追加できる階層の算出)・`OrganizationUnitNode`型。prisma非依存の純粋関数のみを置く(下記「設計判断」参照)

### 変更
- `lib/organization-unit.ts` + テスト: `getOrganizationUnitDeleteBlockReason`(配下・所属社員の参照チェック)を追加
- `components/home/HomeTiles.tsx`: `master`タイルに`href: "/master"`を追加
- `lib/breadcrumbs.ts`: `/master`・`/master/organization-units`のエントリを追加

## 設計判断

1. **ロールチェック**: MANAGER専用画面は本リポジトリ初。既存の`register/page.tsx`等の`auth()`→未ログインは`/login`→権限外ロールは`/`にリダイレクトのパターンを踏襲し、`lib/organization-unit.ts`内の`viewerRole === UserRole.MANAGER`(enum比較)に倣った。ページ側・各Server Action側の両方でチェックする(Server Action側は直接呼び出しに対する防御)。
2. **削除制約**: `docs/screens.md`の「配下または所属社員が存在する行は削除不可」を`getOrganizationUnitDeleteBlockReason`で実装。`organizationUnit.count`と`employee.count`を並列取得し、どちらか1件以上あれば`"使用中のため削除できません"`を返す。
3. **保存後の画面遷移方式**: 他のEDT系画面(`redirect()`でマイページ等へ戻る)と異なり、MST004はツリーの同一画面に留まり続ける操作性が必要なため、`revalidatePath("/master/organization-units")`で同一ページのデータのみ更新する方式にした。
4. **prisma依存の分離(実装中に判明した問題)**: 当初`buildOrganizationUnitTree`/`deriveChildLevel`/`OrganizationUnitNode`型を`lib/organization-unit.ts`に置く計画だったが、同ファイルは`prisma`を値importしているため、クライアントコンポーネント(`OrganizationUnitNodeItem.tsx`)からそのままimportするとPrisma Clientの実行時コードごとブラウザバンドルに巻き込まれ、`/master/organization-units`が500エラーになることがPlaywrightでの手動確認で判明した。そのため、これら3つ(prisma非依存の純粋関数・型)を新規ファイル`lib/organization-unit-tree.ts`に分離し(テストも`lib/organization-unit-tree.test.ts`に分離)、クライアントコンポーネントはそちらからimportする形にした。DB取得を伴う関数(`getOrganizationUnitOptions`/`getOrganizationUnitDeleteBlockReason`等)は`lib/organization-unit.ts`に残している。

## 検証方法

- `npm run verify`(prisma generate → ESLint → tsc --noEmit → vitest run 164件)
- Playwright(開発用ログイン)で以下を確認:
  1. 管理職(`000001`)でトップ→マスタ管理タイル→部署マスタ管理と遷移でき、パンくず・「マスタ管理に戻る」導線が機能する
  2. 事業部の新規追加(フォームリセットも確認)
  3. 配下への部署・Grの追加(Gr行には「配下に追加」ボタンが表示されない)
  4. 名称編集(インライン)
  5. 配下も所属社員もない行の削除成功
  6. 配下がある行の削除がブロックされ「使用中のため削除できません」と表示される
  7. 一般社員(`000002`)で`/master/organization-units`に直接アクセスするとトップへリダイレクトされる

## Critical Files

- `app/(authenticated)/master/organization-units/page.tsx`, `actions.ts`
- `components/master/OrganizationUnitManager.tsx`, `OrganizationUnitNodeItem.tsx`
- `lib/organization-unit-tree.ts`, `lib/organization-unit-schema.ts`
- `lib/organization-unit.ts`(`getOrganizationUnitDeleteBlockReason`)

---

## 実装結果(実施済み)

上記プラン通りに実装した。仕様(docs/screens.md)との差異はなし。設計判断4.の通り、実装途中でprisma依存の分離が必要と判明し対応した。

### 検証結果

`npm run verify`(prisma generate → ESLint → tsc --noEmit → vitest 164件)が通過。Playwrightで以下をすべて確認した。

1. 管理職(`000001`)でトップ→マスタ管理タイル→部署マスタ管理と辿れ、パンくず(トップ›マスタ管理›部署マスタ管理)・「マスタ管理に戻る」導線が正しく機能した
2. 事業部「営業事業部」を新規追加でき、フォームもリセットされた
3. 「営業事業部」の配下に「第一営業部」を追加できた(既存の「第一Gr」行には「配下に追加」ボタンが表示されないことも確認)
4. 「第一営業部」を「第二営業部」にインライン編集できた
5. 「第二営業部」(配下・所属社員なし)の削除に成功した
6. 「営業事業部」(配下に「第二営業部」がある状態)の削除を試みると、CMN001確認モーダル→実行後に「使用中のため削除できません」と表示され、削除がブロックされた
7. 一般社員(`000002`)で`/master/organization-units`に直接アクセスすると`/`(トップ)へリダイレクトされた

手動確認の過程で、クライアントコンポーネントがprisma依存モジュールを間接importしてしまい500エラーになる問題を発見・修正した(詳細は設計判断4.参照)。
