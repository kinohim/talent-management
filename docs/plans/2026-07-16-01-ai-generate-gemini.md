# 経歴概要・自己PR AI生成の Gemini API 対応

## Context

EDT002(経歴概要・自己PR登録)のAI生成は Claude API(`claude-opus-4-8`)のみを使用していたが、Claude API には無料枠がなくクレジット残高が不足している。無料枠のある Gemini API での生成を追加し、既定の生成手段とした。UI は「Geminiで生成」「Claudeで生成」の2ボタンを両方活性で並べ、利用者がどちらのAIで生成するかを選択できる(Claude はクレジット残高を補充すれば追加変更なしで使える状態を維持)。

## 変更内容

### Route Handler(`app/api/career-summary/generate/route.ts`)

- リクエストスキーマに `provider: z.enum(["claude", "gemini"]).default("gemini")` を追加。
- APIキー存在チェックを provider 別に分岐(gemini→`GEMINI_API_KEY`、claude→`ANTHROPIC_API_KEY`)。
- 既存の Claude 呼び出しを `generateWithClaude(system, user): Promise<string | null>` としてファイル内関数に切り出し(処理内容は無変更)。
- `generateWithGemini(system, user)` を追加。`@google/genai` の `GoogleGenAI` + `gemini-3.5-flash`、`config.systemInstruction` に既存の system プロンプトを渡す。`response.text` は safety block 時に `undefined` になるため null 扱いで既存の 502 に落とす。
- catch 節に `@google/genai` の `ApiError` 分岐を追加(Anthropic 分岐の前)。`status === 429`(無料枠のquota超過・レート制限)は 429「AI生成の無料利用枠の上限に達しました。時間をおいて再度お試しください。」、その他は 502。
- プロンプト構築(`lib/career-text-prompt.ts`)は両プロバイダ共通で無変更。

### UI(`components/career-summary/AiGeneratePanel.tsx`)

- 「Geminiで生成」(プライマリ)・「Claudeで生成」(枠線のセカンダリ)の2ボタンを横並びで表示。どちらも活性。
- `generate(provider)` / `handleGenerateClick(provider)` を provider 引数付きに変更し、fetch body に `provider` を含める。置き換え確認パネル経由の場合も押したボタンの provider を state(`confirmProvider`)で引き継ぐ。
- 生成中は両ボタン disabled、クリックした側のみ「生成中...」表示(`generatingProvider` state)。

### 設定・ドキュメント

- `@google/genai` を dependencies に追加(`@anthropic-ai/sdk` は温存)。
- `.env.example` に `GEMINI_API_KEY=` を追加。
- `docs/screens.md` EDT002 に2ボタン仕様を追記。

## モデル選定の経緯

- 当初は `gemini-2.5-flash` を採用予定だったが、API から 404「This model is no longer available to new users」が返った。**2.5-flash は新規ユーザーへの提供が終了**しているため、現行の安定版で無料枠対象の **`gemini-3.5-flash`** を採用した。
- pro 系モデルは無料枠対象外(2026年4月以降、無料枠は Flash / Flash-Lite のみ)。

## Gemini APIキーに関する知見

- Google AI Studio で新規発行されるキーは **`AQ.` プレフィックスの新形式**(旧 `AIza` 形式は新規発行不可・段階的廃止中)。`@google/genai` でそのまま使える。
- 初回発行したキーが 401 UNAUTHENTICATED(ACCESS_TOKEN_TYPE_UNSUPPORTED)で全エンドポイントに拒否される事象に遭遇。**キーを削除して再発行したところ解消**した(同アカウントでも動くキーと動かないキーがあるという報告が Google AI Developers Forum に多数ある既知の問題)。
- 無料枠の目安: gemini-3.5-flash で約10リクエスト/分・250リクエスト/日。日次リセットは米国太平洋時間の深夜0時。

## 検証

- `npm run verify` 全項目パス(ESLint / tsc / Vitest 376件)。
- Playwright 実機確認: 「Geminiで生成」で経歴概要の下書きが実生成されること(387/1000文字、登録データを反映)、「Claudeで生成」でクレジット残高不足の502メッセージが表示されること、置き換え確認パネル・GEMINI_API_KEY 未設定時の500メッセージを確認。
