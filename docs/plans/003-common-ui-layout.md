# 003 共通レイアウト・UI部品・JST日時基盤

## 目的

全画面が共有するレイアウト(ヘッダ・パンくず)・UI部品・日時フォーマット基盤を先に整備し、以後の画面planが画面固有の実装に集中できるようにする。

## 前提(依存するplan)

- 002 認証基盤(ヘッダにログインユーザー名を表示するため)

## 実装内容

- `app/(authenticated)/layout.tsx`: 認証必須のルートグループ。未ログインは`/login`へリダイレクト。ヘッダ(アプリ名・ユーザー名・ログアウト)とパンくずを**画面上部に固定**し、スクロールしても常に表示する(docs/screens.md冒頭)
- `components/layout/Breadcrumbs.tsx`: 全画面共通のパンくずリスト(AUTH001を除く)
- `components/layout/BackLink.tsx`: 「◯◯に戻る」リンクの共通部品
- `components/layout/ListQueryRecorder.tsx`+`useListQueryHref.ts`: 一覧画面の絞り込み・ソート・ページ状態をブラウザタブ単位(sessionStorage)で記憶し、戻り遷移で復元する仕組み(REF002/REF007で使用)
- `components/ui/`: 共通UI部品一式
  - `Tile`(トップのナビタイル。href省略で「準備中」表示)
  - `ConfirmDialog`(CMN001 削除確認モーダル。メッセージ・実行ボタン文言を呼び出し元から指定可能)
  - テキスト入力(フィールド内右端の×クリア付き)、`DateField`(年4桁制限・自前カレンダーアイコン・×クリア)等、docs/screens.md「入力フィールドの共通仕様」を満たす入力部品
  - ボタンの共通スタイル(ポインタカーソル+ホバー背景色)
- `lib/date-format.ts`: ユーザー向け日時表示をJST固定で行うフォーマッタと、JST基準の「今日」「今の年月」を返す`nowJstClock`等(docs/decisions.md「日時とタイムゾーン」)。`TZ`環境変数に依存しない。単体テスト付き
- `lib/employee-labels.ts`: 「◯◯（仮登録）」表示ルール(氏名あり かつ is_registered=false のときだけ付与)+単体テスト

## 受け入れ基準

- 認証済みルート配下の全ページでヘッダ・パンくずが固定表示される
- 未ログインで認証済みルートにアクセスすると`/login`へリダイレクトされる
- 日時表示が実行環境のタイムゾーンに関係なくJSTで一定である(テストで担保)
- CMN001が「キャンセル」「実行」の2ボタンで動作し、メッセージを呼び出し元から差し替えられる

## 検証方法

1. `lib/date-format.test.ts`・`lib/employee-labels.test.ts`等の単体テストを実行する
2. 開発サーバーでログイン→認証済みページを開き、ヘッダ固定・パンくず表示・ログアウト動作を確認する
3. `npm run verify`が通ることを確認する
