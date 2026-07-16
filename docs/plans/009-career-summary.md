# 009 経歴概要・自己PR登録(AI生成含む)

## 目的

経歴概要・自己PRをmypage[表紙]タブのセクションとして編集できるようにし、登録済みデータからのAI文章生成(Gemini/Claude選択式)を提供する(docs/screens.md mypageの経歴概要・自己PRセクション)。

## 前提(依存するplan)

- 008 mypage 私の経歴書(セクション骨格)
- `GEMINI_API_KEY`/`ANTHROPIC_API_KEY`の払い出し(未設定時はエラー文言で案内)

## 実装内容

- 経歴概要・自己PRセクション(`components/career-summary/CareerSummaryForm.tsx`): 各項目1000文字以内+文字数カウンター。「登録用フォーム｜←ボタン｜AI生成パネル」の横並びで、フォームとパネルは同じ枠スタイル・同じ高さ。テキストエリアはリサイズ可能
- `components/career-summary/AiGeneratePanel.tsx`: AI生成パネル
  - 「Geminiで生成」「Claudeで生成」の2ボタン。生成中はクリックした側のみ「生成中...」
  - 生成結果は保存されない旨を表示し、「←」ボタンで登録用フォームへコピーする
  - パネルに既存の文章がある状態での再生成は上書き確認(「以後確認しない」はsessionStorageでセッション内のみ記憶)
  - データ不足時の案内、エラー種別ごとの文言表示(docs/screens.md mypageの経歴概要・自己PRセクション)
- `app/api/career-summary/generate/route.ts`: 生成API(Route Handler)
  - 認証必須。人事・営業は403
  - 本人の経歴・スキル・資格・経験月数を取得してプロンプトを構築し、`provider`に応じてGemini(`gemini-3.5-flash`)/Claude(`claude-opus-4-8`、adaptive thinking)を呼び出す
  - 429(無料枠/レート制限)・クレジット残高不足・safety block等をユーザー向け文言に変換して返す
- `lib/career-text-prompt.ts`: プロンプト構築・不足データ列挙の純粋関数群+単体テスト

## 受け入れ基準

- 1000文字制限・文字数カウンターが機能する
- 両プロバイダで生成でき、結果が←コピーでフォームに反映され、保存できる
- 上書き確認・データ不足案内・エラー文言が仕様どおり表示される
- 人事・営業ではAPIが403を返す

## 検証方法

1. `lib/career-text-prompt.test.ts`でプロンプト構築・不足判定を網羅する
2. Playwrightでセクション編集・AI生成→コピー→保存の一連を確認する(APIキー未設定環境ではエラー文言を確認)
3. `npm run verify`が通ることを確認する
