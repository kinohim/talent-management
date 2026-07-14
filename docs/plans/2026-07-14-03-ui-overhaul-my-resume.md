# UI一括改修 + マイページ→「私の経歴書」大改修 実装計画

## Context

ユーザーレビューにより、ログイン画面〜マスタ管理までの横断的なUI改善と、
マイページを「私の経歴書」(タブ付き・1画面で全編集可能)へ作り替える大仕様変更を実施した。

確認済みの決定事項:

- プロジェクト検索は現場マスタ(site)から選択
- 一覧はページ送りあり。ページ番号・全件数・表示件数セレクトは一覧上部右側
- 単独編集画面は /register(初回登録)のみ残し、/career-summary・/skills・/certifications は廃止
- ヘッダ絞込は列ごとのフィルタポップアップ(Excelオートフィルタ風)

## 1. ログイン画面 (AUTH001)

対象: `components/auth/SsoLoginButtons.tsx`, `app/login/page.tsx`

- 並び順: 準備中を先頭に。Microsoft(準備中) → Google(準備中) → GitHub(活性)。GitHub未設定時はGitHubも準備中表現
- ブランドカラー配色: Microsoft `#0078D4` / Google 白地+`#4285F4` / GitHub `#24292F`。非活性も同系色の淡色
- 非活性ボタンに時計アイコン(インラインSVG)+「(準備中)」表記
- 開発用ログイン説明文を2行に分割

## 2. 全画面共通: ヘッダ・パンくず固定

対象: `app/(authenticated)/layout.tsx`

- header + Breadcrumbs を1つの sticky コンテナ(`sticky top-0 z-40 bg-[var(--background)]`)で包む

## 3. 経歴書詳細 (REF003)

対象: `app/(authenticated)/resumes/[employeeId]/page.tsx`, `components/resumes/ResumeSkillList.tsx`, `lib/breadcrumbs.ts`, `lib/employee-labels.ts`

- 戻り導線の一本化: breadcrumbs の `/resumes/[id]` の親を `/mypage` → `/resumes` に変更し、ページ内の「経歴書一覧に戻る」リンクを削除(「マイページに戻る」との二重表示を解消)。本人プレビュー用のマイページ導線は廃止
- スキル一覧のタグ表示化: カテゴリ見出しの下に `[Java ◎][Git ○]` 形式の pill を横並び。習熟度は記号のみ(`skillLevelSymbol` を新設)、凡例をセクション末尾に表示

## 4. 一覧系画面 (REF002 経歴書一覧 / REF007 アカウント一覧)

方針: 既存の「Server Component + URL searchParams」方式を維持し、ソート・ページング・列フィルタも searchParams に載せる。DBクエリ(orderBy/skip/take/count)はサーバー側で完結。

### searchParams キー設計

- 共通: `page`(1始まり・default 1)、`pageSize`(10|30|50|100・default 30)、`sort`(列キー許可リスト)、`order`(asc|desc)
- 列フィルタ: `colName`/`colOrg`(繰返し+`none`)/`colExpMin,colExpMax` 等
- 検索フォーム送信時は `col*`/`sort`/`page` を破棄(pageSize のみ引継ぎ)。列フィルタ・pageSize 変更時は `page` を削除して1ページ目へ

### 新規ファイル

- `lib/list-query.ts`(+test): `parsePagination` / `parseSort` / `clampPage`(全ソートに `employeeId` タイブレーク)
- `components/ui/PaginationControls.tsx`: 全N件表示+ページ番号+前へ/次へ+表示件数セレクト。パス非依存で両画面共用
- `components/ui/DataTableHeaderCell.tsx`: ソートトグル(▲/▼/⇅)+フィルタポップオーバー(text / enum / numberRange)
- `components/ui/CascadingOrganizationUnitFilter.tsx`: 初期表示は根(事業部)のみ、親をチェックすると子が展開。未選択の親に「部署N件 ▸」+説明文。親チェック解除で配下選択も解除
- `lib/organization-unit-tree.ts` に `resolveEffectiveOrgUnitIds` 追加(+test): 親+子が選択されたら最深のチェックノード配下のみを検索対象(親のみ選択=配下全部で従来互換)
- `lib/project-options.ts` に `getSiteOptions` 追加(現場のみの軽量版)

### 変更ファイル

- `lib/resume-search.ts`(+test): 現場・列フィルタのパース追加、`buildResumeOrderBy`(nulls last+タイブレーク)
- `lib/account-list.ts`(+test): 列フィルタパース、`buildAccountStatusWhere`(状態フィルタのDB where化。取得後のJS filterを廃止)、`buildAccountOrderBy`
- `components/resumes/ConditionTagFilter.tsx`: AND/OR をトグル→ラジオ選択。mode props を optional 化
- `components/resumes/ResumeFilterForm.tsx`: `<details>`3連 → 1枚カード内グリッド。氏名カナを `w-64` に短縮
- `components/resumes/ResumeSearchResultTable.tsx` / `components/accounts/AccountTable.tsx`: thead を DataTableHeaderCell 化。0件時もヘッダは表示(列フィルタ解除のため)。AccountTable にメールアドレス列を追加
- `app/(authenticated)/resumes/page.tsx` / `accounts/page.tsx`: count+findMany+skip/take、`user: { isNot: null }` の where 化、列フィルタのwhere合成(一般社員はスコープと積集合)
- 旧 `components/accounts/OrganizationUnitTreeFilter.tsx` は削除

## 5. マスタ管理4画面 (MST001〜005)

- `components/master/InlineAddForm.tsx` 新設: 1行コンパクト追加フォーム(resetKey/prevState比較パターンを集約)
- MST004 部署: `OrganizationUnitNodeItem` に開閉 state(初期閉・▶/▼+子件数バッジ)。初期表示は事業部のみ。行は「名称左・ボタン右端」に統一。「事業部を追加」はInlineAddFormで最上部に常時表示。「配下に追加」実行時は自動展開
- MST001/002 スキル・資格: 最上部に「カテゴリを追加」InlineAddForm(新Server Action `createSkillCategory` / `createCertificationCategory` + `parseCategoryNameForm`)。グルーピングをcategories配列駆動に変更(0件カテゴリも表示)。カテゴリ見出しは開閉式+件数バッジ+右端[+ 追加](カテゴリ確定済みのインラインフォーム展開。hidden categoryIdで既存 `saveSkill`/`saveCertification` を利用)
- MST003/005: 上部追加フォームをInlineAddFormでコンパクト化

## 6. 大仕様変更: マイページ → 「私の経歴書」

### 主要な設計判断

- URL は `/mypage` のまま、表示名のみ「私の経歴書」に変更
- タブは `?tab=cover|projects`: page.tsx(server)が両タブのパネルをサーバーレンダリングし、client の `MyResumeTabs` にスロット渡し。切替は client state + `history.replaceState`
- セクション編集: 汎用 client `EditableSection`(view/formスロット+編集/キャンセル)。保存成功通知は `SectionEditContext`(`useSectionEdit`)経由。編集モード enter ごとに form を key 再マウント
- Server Action 再設計: `saveCareerSummary`/`saveSkills`/`saveCertifications` は redirect を廃止 → `revalidatePath("/mypage")` + `saved: true`。`saveBasicInfo` は `variant: "register" | "section"` で分岐(register時のみ redirect)。4 action を `app/(authenticated)/mypage/actions.ts` に集約
- REF006(プロジェクト一覧)は実績タブに統合: `/projects` 一覧ページ削除、`ProjectListPanel` に抽出。`projects/actions.ts` の redirect 先を `/mypage?tab=projects` に変更。`/projects/new`・`/projects/[id]` は存続
- プレビュータイル廃止(表紙タブの閲覧モードがプレビュー同等)。PDF/Excel出力(準備中)は表紙タブ下部

### 画面構成

- [表紙]タブ: EditableSection「基本情報(最終学歴含む)」「経歴概要・自己PR(AI生成含む)」「スキル」「資格」+ ResumeExportButtons
- [実績]タブ: ProjectListPanel(一覧+新規追加→/projects/new)

### ファイル変更

- 新規: `components/my-resume/MyResumeTabs.tsx`、`components/my-resume/EditableSection.tsx`、`components/projects/ProjectListPanel.tsx`、`app/(authenticated)/mypage/actions.ts`、`lib/my-resume-tabs.ts`(+test)
- 変更: `mypage/page.tsx`(全面書換)、`register/page.tsx`、4フォームコンポーネント(import先変更+saved検知→onSaved)、`HomeTiles.tsx`、`lib/breadcrumbs.ts`+test(`/projects/new`・`/projects/[id]` の親=合成キー `/mypage?tab=projects`)
- 削除: `app/(authenticated)/career-summary/`、`skills/`、`certifications/`、`projects/page.tsx`、`register/actions.ts`、`components/mypage/`

## docs 更新

- `docs/screens.md`: AUTH001/REF002/REF003/REF004(全面書換)/REF006(統合注記)/REF007/EDT001〜004(位置づけ変更)/MST001/002/004
- `docs/screen-flow.md`: mypage 周辺の遷移を書換(EDT002〜004・REF006 ノード削除)
- `docs/decisions.md`: 「私の経歴書(REF004)の1画面統合」節を追加

## 検証

- `npm run verify` 全項目パス(39ファイル・333テスト)
- Playwright で全改修画面を実機確認(ログイン配色/並び、固定ヘッダ、カスケード組織、ソート/列フィルタ/ページング、スキルタグ表示、マスタ開閉UI、タブ切替・セクション編集→保存→閲覧復帰、実績タブ導線・パンくず)。コンソールエラーなし
