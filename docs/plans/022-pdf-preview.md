# 022 pdf-preview PDF出力プレビュー

## 目的

経歴書をPDFとして出力(ダウンロード)する直前に、レイアウトとマスク内容を確認・調整する画面を提供する(docs/screens.md pdf-preview)。PDF生成はブラウザ印刷ベース(`window.print()`+印刷用CSS)で、追加ライブラリを使わない(docs/decisions.md「出力(PDF)」)。

## 前提(依存するplan)

- 013 resume-detail 経歴書詳細(表示コンポーネント・閲覧導線)
- 020 resume-list 経歴書一覧(「PDF」ボタンの導線元)
- 008 mypage 私の経歴書(「PDF出力」ボタンの導線元)

## 実装内容

- ルートは遷移元ごとに2つ: `app/(authenticated)/resumes/[employeeId]/pdf-preview/page.tsx`(経歴書一覧・resume-detail発)と`app/(authenticated)/mypage/pdf-preview/page.tsx`(mypage発・本人のみ)
  - 権限は「本人・人事・営業・管理職」のみ(一般社員は自身の経歴書のみ。閲覧範囲内の他人でもURL直指定を拒否しトップへ)。未登録社員もトップへ
  - データ取得は`lib/resume-view-data.ts`(`getResumeForView`=resume-detailと共用のフルinclude、`buildPdfResumeData`=クライアントへ渡す絞り込み)
- 画面構成:
  - 画面名「PDF出力プレビュー」の右に注意書き(`components/pdf-preview/PdfPreviewHeading.tsx`)
  - 「ダウンロード」ボタン1つ(印刷ボタンなし)。右上・経歴書シート(A4幅)右端揃え。押下で印刷ダイアログを開き送信先「PDFに保存」で保存
  - プレビューはA4シート(`.print-sheet`で白背景・黒文字固定)。印刷時はヘッダ・パンくず・操作類を`print:hidden`で除外
- 出力項目の制御(`components/pdf-preview/PdfPreviewClient.tsx`+`PdfResumeDocument.tsx`):
  - 氏名は表示兼入力フィールド(入力値がそのまま出力)。右横の実名/イニシャル選択が入力欄へ反映され手修正可能。イニシャルはカナ(姓 名)のヘボン式頭文字「Y.T」(`lib/print-name.ts`の`initialsFromKana`)。カナ不備時は非活性+ツールチップ
  - 項目別マスクはトグルスイッチ(基本情報6+最終学歴5)。マスクONは画面上グレーアウトで残し印刷からのみ除外して詰める(カナのみ氏名と横並びのためスペースを確保)。基本情報/最終学歴の見出し右にセクション一括トグル
  - 初期値はロール別マトリクス(`lib/pdf-preview-settings.ts`の`defaultPdfPreviewSettings`)。人事・営業/管理職(他人)はイニシャル+経験年数以外全マスク、本人・管理職自身は実名・マスクなし。**設定は保持せず画面を開くたびに初期値を適用**(ユーザー操作は画面表示中のみ有効)
- 導線と戻り(パンくず/BackLink):
  - 一覧の「PDF」(人事・営業/管理職は全行、一般社員は自分の行のみ)は`?from=list`付きで遷移し、上位=経歴書一覧(`lib/breadcrumbs.ts`の合成キー)。詳細の「PDF出力」(人事・営業/管理職+本人)発は上位=経歴書詳細。mypage発は上位=私の経歴書
- 印刷CSS: `app/globals.css`の`@page`(A4・余白12mm)・`.print-sheet`色固定、カード類の`break-inside-avoid`
- カナ入力の前提整備: basic-info/mypageのカナは「姓 名」2語(スペース区切り)必須+注記(イニシャル生成の前提。007参照)

## 受け入れ基準

- 権限: 一般社員は自身以外の`/resumes/[id]/pdf-preview`を開けない(URL直指定でもトップへ)
- 初期値マトリクスがロール・対象どおりに適用され、リロード・社員をまたぐ遷移で必ず初期値に戻る
- マスクした項目が印刷結果から除外されて詰まり(カナはスペース維持)、画面上はグレーアウトで残る
- 氏名の実名/イニシャル/手修正が出力へ即時反映される。カナ不備の社員ではイニシャルが非活性
- 遷移元に応じてパンくず・戻るが出し分けられる

## 検証方法

1. `lib/print-name.test.ts`・`lib/pdf-preview-settings.test.ts`・`lib/breadcrumbs.test.ts`で純関数を網羅する
2. Playwrightでロール別初期値・トグル反映・印刷メディアエミュレーション(除外/詰め/スペース維持)・権限リダイレクト・導線別のパンくずを確認する
3. `npm run verify`が通ることを確認する
