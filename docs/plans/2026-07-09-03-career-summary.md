# 実行計画③: EDT002(経歴概要・自己PR登録)

## Context

マイページ(REF004)のタイルのうちEDT002へのリンクが未実装(準備中)だった。
`employee.career_summary`/`employee.self_pr`は既にスキーマに存在するためマイグレーション不要。
EDT001(`app/(authenticated)/register/`)と同じ「Server Component + Server Action」の型を
そのまま踏襲できる画面として選定した。

## 実装方針

EDT001の`lib/basic-info-schema.ts` / `register/actions.ts` / `register/page.tsx` /
`BasicInfoForm.tsx`と同型。相違点は自由記述テキストエリア2つ(各1000文字・文字数カウンター)のみで、
マスタ選択や日付変換は不要。

## 実装内容

- `lib/career-summary-schema.ts`(新規) + `lib/career-summary-schema.test.ts`(新規):
  `careerSummary`/`selfPr`とも任意・1000文字以内のzodスキーマ、`parseCareerSummaryForm`、
  `flattenFieldErrors`
- `app/(authenticated)/career-summary/actions.ts`(新規): `saveCareerSummary`。認可(未認証→`/login`、
  HR_SALES→防御的に`/login`)→zodパース→`prisma.employee.update`(`updatedProgram: "EDT002"`)→
  `redirect("/mypage")`
- `app/(authenticated)/career-summary/page.tsx`(新規): 認可(未認証/HR_SALES/`resolveDestination`による
  未登録者ガード、`register/page.tsx`・`mypage/page.tsx`と同パターン)→`employee`取得→
  `CareerSummaryForm`へ`defaultValues`を渡す
- `components/career-summary/CareerSummaryForm.tsx`(新規, client): `useActionState` +
  `useState`でテキストエリアごとに文字数を`{length}/1000`表示
- `lib/breadcrumbs.ts`(変更): `"/career-summary": { label: "経歴概要・自己PR登録", parentPath: "/mypage" }`追加
- `lib/breadcrumbs.test.ts`(変更): 上記パスのtrailを検証するケース追加
- `components/mypage/MyPageTiles.tsx`(変更): `summary`タイルの`href`を`/career-summary`に設定

## 実装順序

1. `lib/career-summary-schema.ts` + テスト
2. `app/(authenticated)/career-summary/actions.ts`
3. `app/(authenticated)/career-summary/page.tsx`
4. `components/career-summary/CareerSummaryForm.tsx`
5. `lib/breadcrumbs.ts`更新
6. `components/mypage/MyPageTiles.tsx`更新
7. `npm run verify`

## 検証方法

- `npm run verify`(prisma generate → ESLint → tsc --noEmit → vitest run)
- Playwrightで開発用ログイン(`000001`)を使い、マイページ→経歴概要・自己PRタイルへの遷移、
  パンくずと戻るリンクの表示、テキストエリアの文字数カウンター更新、保存後の`/mypage`遷移、
  再訪問時の値の初期表示、未認証時の`/login`リダイレクト、人事・営業ロールでの`/`リダイレクトを確認する

---

## 実装結果(実施済み)

上記プラン通りに実装した。実施段階での逸脱・追加対応はなかった。

`npm run verify`(lint・tsc・vitest 48件)が通過。Playwrightで開発用ログイン(`000001`)を使い、
以下をすべて確認した。

1. マイページ→経歴概要・自己PRタイルへの遷移、パンくず「トップ›マイページ›経歴概要・自己PR登録」と
   戻るリンク表示
2. 両テキストエリアへの入力で文字数カウンターが`20/1000`等に更新
3. 保存→`/mypage`へリダイレクト
4. `/career-summary`再訪問で入力値が初期表示される(DB保存の確認)
5. ログアウト後`/career-summary`直接アクセス→`/login`へリダイレクト
6. 人事・営業(`000003`)でログイン後`/career-summary`直接アクセス→`/`へリダイレクト

コンソールエラーなし。
