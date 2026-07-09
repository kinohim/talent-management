# 実行計画②: パンくずリスト・戻るリンク・REF004(マイページ)

## Context

前回のセッションでAUTH001(ログイン)→REF001(トップ)→EDT001(基本情報登録)の認証〜初回登録
フローを実装したが、以下3点が未対応のまま残っていた。

1. `docs/README.md`「全画面パンくずリスト対応」・`docs/screens.md`「全画面共通でパンくず
   リストによる画面間移動に対応する(AUTH001ログインを除く)」という明示要件が未実装
2. 画面遷移図(`docs/screen-flow.md`)が前提とする「戻る」操作(パンくずとは別の導線)も未実装
3. REF001の「マイページ」タイルが本来の遷移先REF004(マイページ)を経由せず、暫定的に
   EDT001(`/register`)へ直接飛ぶ実装になっていた(前回セッションでREF004未実装のため
   一時的な措置とTODOコメントを残していた)

今回、ユーザーからの直接指示でこの3点をまとめて解消する。REF004自体は複数メニュー
(基本情報・経歴概要・スキル・資格・プロジェクト経歴・プレビュー・PDF出力・Excel出力)
を持つ画面だが、基本情報以外は個別画面が未実装のため、REF001の「準備中」タイルと同じ
扱い(表示するがクリック不可)とすることをユーザーに確認済み。

## 設計判断

- **パンくずの実装方式**: URLセグメント自動導出ではなく、`pathname → {label, parentPath}`
  の明示的な階層マップを採用する。`/register`は論理階層上`/mypage`の子だが、URLパスとしては
  兄弟関係にあり、URL構造からの自動導出では表現できないため。
- **共通化の場所**: `app/(authenticated)/layout.tsx`に一箇所追加し、配下の全画面
  (REF001・REF004・EDT001、および将来追加される画面)に自動適用する。既存の認証チェック・
  共通ヘッダーの集約方針と一致する。`/login`はこのroute group外なのでAUTH001除外は
  構造的に自然に満たされる。
- **「戻る」リンクの遷移先**: `history.back()`ではなく、パンくずと同じ階層マップの
  「直近の親」への固定リンクとする(ユーザー確認済み)。決定的でテスト可能、直接URL
  アクセス時も安定動作する。
- **将来の申し送り**: REF003(閲覧経路によりREF002/REF004どちらから来たかで戻り先が
  変わる)のような「戻り先が呼び出し元依存」の画面が将来実装される際は、この静的マップ
  だけでは表現できない。その時点で拡張(クエリパラメータ等)を検討する旨をコードコメントで
  明記する。今回の対象画面(REF001/REF004/EDT001)ではこの問題は発生しない。

## 実装内容

### 1. `lib/breadcrumbs.ts`(新規) + `lib/breadcrumbs.test.ts`(新規)

```ts
export type BreadcrumbNode = { label: string; parentPath: string | null };

export const BREADCRUMB_MAP: Record<string, BreadcrumbNode> = {
  "/": { label: "トップ", parentPath: null },
  "/mypage": { label: "マイページ", parentPath: "/" },
  "/register": { label: "基本情報登録", parentPath: "/mypage" },
};

export type BreadcrumbItem = { label: string; path: string };

// ルート→現在地の順で返す。未登録パスは空配列(パンくず非表示、安全側のフォールバック)。
export function getBreadcrumbTrail(pathname: string): BreadcrumbItem[] { ... }
```

テストは`/`・`/mypage`・`/register`それぞれの trail 内容と順序、および未登録パスで
空配列になることを検証する。

### 2. `components/ui/Tile.tsx`(移動) + `components/home/HomeTiles.tsx`(import修正)

`components/home/Tile.tsx`はREF001専用ロジックを持たない汎用UIパーツであり、REF004でも
使うため`components/ui/Tile.tsx`へ移動する(既存の`components/ui/PillSelect.tsx`と同じ
「汎用UI置き場」規約に合わせる)。内容は変更しない。`HomeTiles.tsx`のimport元を修正する。

### 3. `components/layout/Breadcrumbs.tsx`(新規)・`components/layout/BackLink.tsx`(新規)

いずれも`"use client"`。`usePathname()` + `getBreadcrumbTrail()`で現在地の階層を取得する。

- `Breadcrumbs`: trailが空なら非表示。トップページでも「トップ」単独のパンくずを表示する
  (末尾のみ非リンクの現在地表示、`aria-current="page"`)。
- `BackLink`: trailの要素数が2未満(親を持たない=トップ)なら非表示。直近の親へのリンクを
  `←{親のlabel}に戻る`の形式で表示する(遷移先が分かるようにラベルを含める)。

### 4. `app/(authenticated)/layout.tsx`(変更)

既存のヘッダー(氏名/ロール/ログアウト)の下に`<Breadcrumbs />`を配置。その下、
`{children}`の直前に左寄せで`<BackLink />`を配置する(パンくずとは視覚的に別の行として
分離し、「画面左側」の導線として独立させる)。

### 5. `components/mypage/MyPageTiles.tsx`(新規)・`app/(authenticated)/mypage/page.tsx`(新規)

REF004の8項目をタイル表示する。「基本情報」のみ`/register`へのリンクを持ち、残り7項目
(経歴概要・自己PR/スキル/資格/プロジェクト経歴/プレビュー/PDF出力/Excel出力)は
`href`未指定で`Tile`コンポーネントの「準備中」表示に委ねる。

`mypage/page.tsx`の認可は既存`register/page.tsx`と同じパターン: `auth()`必須、HR_SALESは
`/`へリダイレクト(REF004は一般社員/管理職限定)、`resolveDestination`による未登録者への
`/register`強制リダイレクトも同様に適用する(REF001と同じ恒常ガード)。

### 6. 遷移先の修正(既存ファイル)

- `app/(authenticated)/register/actions.ts`: `saveBasicInfo`成功後の`redirect("/")`を
  `redirect("/mypage")`に変更し、REF004未実装を理由にしていたTODOコメントを削除する
  (docs/screens.md「保存後の遷移先(共通ルール)」通りの本来の遷移先に修正)。
- `components/home/HomeTiles.tsx`: `mypage`タイルの`href`を`/register`から`/mypage`に
  変更し、暫定実装を示すコメントを削除する。

## 実装順序

1. `lib/breadcrumbs.ts` + テスト
2. `components/ui/Tile.tsx`への移動、`HomeTiles.tsx`のimport修正
3. `components/layout/Breadcrumbs.tsx`・`BackLink.tsx`
4. `app/(authenticated)/layout.tsx`に組み込み
5. `components/mypage/MyPageTiles.tsx`・`app/(authenticated)/mypage/page.tsx`
6. `register/actions.ts`・`HomeTiles.tsx`の遷移先修正
7. `npm run verify`

## 検証方法

- `npm run verify`(prisma generate → ESLint → tsc --noEmit → vitest run)
- Playwrightで実ブラウザ操作し、既存の開発用ログイン(社員ID`000002`等)で以下を確認する:
  - トップ画面にパンくず「トップ」が単独表示され、左側に戻るリンクが出ないこと
  - マイページタイル押下で`/mypage`に遷移し、パンくずが「トップ › マイページ」、
    左側に「←トップに戻る」リンクが表示されること
  - マイページの「基本情報」タイルから`/register`に遷移し、パンくずが
    「トップ › マイページ › 基本情報登録」、戻るリンクが「←マイページに戻る」であること
  - 基本情報登録を保存すると`/mypage`(マイページ)へ遷移すること(`/`ではない)
  - マイページの他7タイルが「準備中」でクリック不可であること

---

## 実装結果(実施済み)

上記プラン通りに実装し、以下は実施の過程で発生した軽微な修正。

- `lib/breadcrumbs.ts`の`getBreadcrumbTrail`実装で、ループ内`const node = BREADCRUMB_MAP[current]`
  にTypeScriptの循環型推論エラー(TS7022)が発生。`node`に明示的な型注釈
  (`BreadcrumbNode | undefined`)を付けて解消
- `git mv`未対応(未コミットのため)だったので`mv`コマンドでファイル移動

`npm run verify`(43件のテスト)通過、Playwrightでの実ブラウザ操作によりトップ→マイページ→
基本情報登録→保存→マイページの一連の遷移、パンくず・戻るリンクの表示内容、マイページの
準備中タイル群を確認済み。
