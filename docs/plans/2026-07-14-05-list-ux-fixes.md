# 一覧UXの不具合修正 + トップ画面のロール別メニュー分離 実装計画

## Context

UI改修第2ラウンド(2026-07-14-04)後のユーザーレビューで報告された3件の不具合
(ヘッダ絞込ポップアップの誤クローズ、一覧絞り込みの喪失、経験年数の説明不足)の修正と、
トップ画面のロール別メニュー分離を実施した。

## 1. ヘッダ絞込ポップアップが内部スクロールで閉じる

対象: `components/ui/DataTableHeaderCell.tsx`

- 原因: fixed配置のポップオーバーはページスクロールで位置がずれるため scroll イベントで閉じる設計だが、
  イベントをキャプチャ段階(`addEventListener("scroll", fn, true)`)で拾っているため、
  ポップオーバー内部の `overflow-y-auto`(所属組織の値リスト等)のスクロールでも閉じてしまっていた
- 修正: scroll ハンドラで発生元が `containerRef`(ポップオーバーを含むth)内部なら無視する。
  ページ本体のスクロールでは従来どおり閉じる

## 2. 一覧の絞り込みが「戻る」で解除される (REF002/REF007)

- 原因: 検索条件・ソート・ページはURLのsearchParamsに載っているが、
  「経歴書一覧に戻る」「アカウント一覧に戻る」(グローバルBackLink)とパンくずのリンクが
  クエリなしの固定パス(`/resumes`・`/accounts`)を指すため、詳細・登録画面から戻ると条件が失われる
- 修正: 一覧画面の最新クエリをsessionStorageに記憶し、戻り先リンクで復元する
  - `lib/list-query-memory.ts`(新規): 対象パスのホワイトリスト(`/resumes`・`/accounts`)と
    `saveListQuery`/`restoreListQuery`。記憶はブラウザタブ単位・セッション内のみ
  - `components/layout/ListQueryRecorder.tsx`(新規): `usePathname`+`useSearchParams` で
    一覧画面の最新クエリを記憶する常駐コンポーネント。`(authenticated)/layout.tsx` に
    Suspense で包んで配置
  - `components/layout/useListQueryHref.ts`(新規): リンクhrefに記憶済みクエリを付与するフック。
    sessionStorageはSSRで読めないため `useSyncExternalStore` によるhydration完了検知後にのみ反映
    (hydration不一致とlintの set-state-in-effect を回避)
  - `components/layout/BackLink.tsx` / `Breadcrumbs.tsx`: hrefを `withListQuery(path)` に変更
- 保存後のServer Actionのredirect(クエリなしの`/accounts`等)は対象外(遷移後にRecorderが
  クエリなし状態を記憶し直すため整合する)

## 3. 私の経歴書: 経験年数の注意書き

対象: `components/basic-info/BasicInfoForm.tsx`

- 基本情報の編集フォームに、閲覧表示で経験年数が表示されるのと同じ位置(最寄駅の次のグリッドセル)で
  「プロジェクト経歴([実績]タブ)の期間から自動計算されるため、ここでは入力しません。」を表示する
  (計算ルール自体は docs/schema.md の employee テーブル参照)

## 4. トップ画面のロール別メニュー分離 (REF001)

対象: `components/home/HomeTiles.tsx`

- タイル定義を一般メニュー(私の経歴書・経歴書一覧・スキルマップ)と
  管理者メニュー(アカウント一覧・マスタ管理)に分割
- 管理者メニューは「管理者メニュー(管理職のみ)」見出し付きの枠+淡い背景(`bg-zinc-50`/dark対応)の
  グループにまとめ、管理職ログイン時のみ表示する

## docs 更新

- `docs/screens.md`: REF001(メニューのグループ分け)、REF002/REF007(「絞り込みの保持」)、
  EDT001(経験年数は自動計算・注意書き表示)

## 検証

- `npm run verify` 全項目パス(39ファイル・337テスト)
- Playwright で実機確認: ポップオーバー内リストのスクロールで開いたまま/ページスクロールで閉じる、
  経歴書一覧(絞込+ソート)→詳細→「経歴書一覧に戻る」でクエリ復元、
  アカウント一覧(絞込+ソート)→新規登録→「アカウント一覧に戻る」でクエリ復元、
  基本情報編集フォームの経験年数注意書き、トップの管理者メニューグループ表示。コンソールエラーなし
