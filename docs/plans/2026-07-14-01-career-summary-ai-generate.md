# EDT002(経歴概要・自己PR登録)AI生成機能 実装計画

## Context

EDT002(経歴概要・自己PR登録)の経歴概要・自己PR両欄に「AI生成」ボタンを追加し、ログイン中社員の登録済み経歴(`Project`)・スキル(`EmployeeSkill`)・資格(`EmployeeCertification`)・登録済みの経歴概要/自己PR自体を Claude API に渡して下書きを生成する。生成結果は DB に保存せず、各欄の出力フォーム(手動編集可能なプレビュー用テキストエリア)に表示し、「←」ボタンで登録用入力欄へ上書き反映する。API 呼び出しはサーバーサイド(Route Handler)で行い、`ANTHROPIC_API_KEY` はクライアントに露出させない。社員IDは Auth.js セッション(`session.user.employeeId`)から取得する。

## 確定仕様

- 対象は経歴概要・自己PRの両方。それぞれ独立した AI 生成ブロック(出力フォーム+←ボタン)を持つ
- 登録済みの経歴概要・自己PRもプロンプトに含め、既存文があればそれを活かした改善版を生成する
- 出力フォームは手動入力・編集可能。1000文字以内で生成し、「この内容は保存されません。反映するには ← ボタンで入力欄へコピーしてください。」という注意書きを常時表示する
- 出力フォームに文字がある状態で再生成すると置き換え確認パネルを表示し、「以後このセッションでは確認しない」を選べる(`sessionStorage`)
- 文体はです・ます調、300〜500字目安(上限は必ず1000文字以内)。経歴概要は事実ベースの要約、自己PRは一人称「私」で強みを2〜3点に絞ったアピール文
- 未登録データがあっても生成は行う。生成後、未登録の項目(経歴/スキル/資格)のみを動的に列挙した促しメッセージを表示する(すべて登録済みなら非表示)
- Anthropic API はクレジット残高0の場合 `400 invalid_request_error`(メッセージに"credit balance too low"を含む)を返す。この場合はリトライを促さない専用の日本語エラーメッセージを表示する

## 実装ファイル

### 新規

- `lib/career-text-prompt.ts`: プロンプト構築の純粋関数群
  - `buildCareerTextPrompt(target, input)`: target ("careerSummary" | "selfPr") ごとに system/user プロンプトを組み立てる。既存文の有無で「改善」/「新規作成」の指示を切り替える
  - `listMissingData(input)`: 経歴・スキル・資格のうち未登録のものを返す
  - `buildMissingDataMessage(missing)`: 未登録項目を「・」区切りで列挙した促しメッセージを生成
- `lib/career-text-prompt.test.ts`: 上記のテスト(vitest、日本語テスト名)
- `app/api/career-summary/generate/route.ts`: POST Route Handler。`auth()`で認証(未ログイン401、HR_SALES403)→`prisma.employee.findUnique`で経歴・スキル・資格・登録済み経歴概要/自己PRを集約(`lib/prisma.ts`のシングルトン経由)→`buildCareerTextPrompt`でプロンプト構築→Anthropic SDK(`claude-opus-4-8`、adaptive thinking)で生成→1000文字に切り詰めて`{ text, missingData }`を返却。エラーは種別ごとに日本語メッセージを分岐(クレジット残高不足/レート制限/その他)
- `components/career-summary/AiGeneratePanel.tsx`: 経歴概要・自己PR共通の AI 生成 UI(出力フォーム・←ボタン・置き換え確認パネル・促しメッセージ)

### 変更

- `components/career-summary/CareerSummaryForm.tsx`: 経歴概要欄・自己PR欄それぞれの直下に`AiGeneratePanel`を配置
- `.env.example`: `ANTHROPIC_API_KEY=`を日本語コメント付きで追加
- `package.json` / `package-lock.json`: `@anthropic-ai/sdk`を追加

## 検証方法

- `npm run verify`(prisma generate → ESLint → tsc → vitest)
- Playwright で `/career-summary` を開き、経歴概要・自己PR両方について AI 生成ボタン・出力フォームへの手動入力・注意書き表示・←での上書き・置き換え確認パネル(「以後確認しない」含む)・クレジット残高不足時の専用エラーメッセージを確認

## Critical Files

- `lib/career-text-prompt.ts`
- `app/api/career-summary/generate/route.ts`
- `components/career-summary/AiGeneratePanel.tsx`, `CareerSummaryForm.tsx`

---

## 実装結果(実施済み)

上記プラン通りに実装した。

### 検証結果

`npm run verify`(lint・tsc・vitest 277件)が通過。Playwrightで以下をすべて確認した。

1. 経歴概要・自己PR両欄にAI生成ブロックが表示され、出力フォームへの手動入力、「この内容は保存されません...」の注意書き表示を確認した
2. 出力フォームに手動入力した文字列を「←」ボタンで登録用入力欄に上書きコピーでき、文字数カウンターが正しく更新されることを確認した
3. 出力フォームに文字がある状態で「AI生成」を押すと置き換え確認パネルが表示され、「以後このセッションでは確認しない」にチェックして「生成する」を押すと、以後は確認パネルなしで生成されることを確認した
4. 実際のAnthropic APIをクレジット残高0の状態で呼び出し、当初想定していた`403 billing_error`ではなく`400 invalid_request_error`(メッセージに"credit balance too low")が返る実際の挙動を確認。この実態に合わせて判定条件を修正し、「AI生成機能のクレジット残高が不足しています。管理者にお問い合わせください。」という専用メッセージが画面に表示されることを確認した
5. `ANTHROPIC_API_KEY`未設定時に「AI生成機能が利用できません(サーバー設定エラー)。管理者にお問い合わせください。」が表示されることを確認した

### 実装時の補足

- claude.aiチャット(Pro/Max等の個人向けサブスクリプション)経由での実現も検討したが、claude.aiチャットにはサーバーサイドから呼び出せる公式APIが存在せず、Pro/Maxのサブスク枠はClaude Code(対話利用)にのみ適用されるため断念し、Anthropic API(Messages API、従量課金)での実装を継続した
