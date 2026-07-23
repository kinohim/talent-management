# repository-001 への非アプリ機能(ハーネス)マージ計画

## Context

ゴールは repository-001 を push すること(社内AIハッカソン提出のため)。

グローバル `~/.claude/CLAUDE.md` はホームディレクトリの設定であり、
**リポジトリの外にあるため push されない**。ハッカソン提出物としてリポジトリだけで
自己完結させる必要があるため、「グローバルにしかない内容」で repository-001 に
持たせたいものは、二重管理になってもよいので repository-001 側のファイルに
複製する。

調査の結果、repository-001 / talentManagement / グローバル設定は共通の土台から
三者それぞれ独自に発展しており、**一方通行の「遅れ」ではない**。そのため
「不足分を機械的に全部追加する」のではなく、**候補ごとに人間が追加する/しないを
判断する**形にする。以下は全て「候補」であり、まだ確定していない。

各項目の「判断」列に `追加する` / `追加しない` / `保留` を書き込んでください。
記入後、その内容に沿って実装に着手します。

---

## A. グローバル `~/.claude/CLAUDE.md` 由来の候補

現状、これらは `~/.claude/CLAUDE.md` にのみ存在し、repository-001 の
`CLAUDE.md` には無い(push されない設定)。追加する場合は repository-001の
`CLAUDE.md` に新セクションとして追記する形を想定。

| # | 内容 | 現在の効力 | 判断 |
|---|---|---|---|
| A-1 | 常に日本語で応答するルール | グローバルのみ | 追加する |
| A-2 | 既存ファイル編集前に方針を説明し承認を得る運用(承認後は一連の編集を都度確認不要。削除・上書きは別途都度確認) | グローバルのみ | 追加する |
| A-3 | ファイル削除・上書き、`git reset --hard`、force push 等の破壊的操作は事前説明・確認必須 | グローバルのみ | 追加する |
| A-4 | `git commit`/`git push` は明示的指示がある場合のみ実行。push許可は1回限り | グローバルのみ(settings.jsonの`git push` denyとは別軸の運用ルール) | 追加する |
| A-5 | PR作成・Issueコメント等、他者から見える操作も明示的指示が必要 | グローバルのみ | 追加する |
| A-6 | npm install/uninstall等の依存追加・削除は事前説明・確認必須 | グローバルのみ | 追加する |
| A-7 | `--no-verify`・`--force`等の検証/hookスキップフラグを使わない | グローバルのみ | 追加する |
| A-8 | 指示範囲を超えたリファクタ・機能追加・抽象化をしない | グローバルのみ | 追加する |
| A-9 | コメントは非自明なWHYがある場合のみ簡潔に記載 | グローバルのみ | 追加する |
| A-10 | 新規ファイル作成より既存ファイル編集を優先 | グローバルのみ | 追加する |
| A-11 | 判断が分かれる・不明な点はユーザーに確認 | グローバルのみ | 追加する |

※「作業の可視化ルール(【目的】【操作】宣言)」はグローバルにもあるが、
talentManagement 経由の B-3 と実質同一内容のため、B-3 側にまとめている。

---

## B. talentManagement 由来の候補(CLAUDE.md セクション)

talentManagement が独自に発展させ、repository-001 にはまだ無いセクション。

| # | 内容 | 概要 | 判断 |
|---|---|---|---|
| B-1 | 「誰をどんな笑顔にするか」 | ターゲット/課題/解決を人間が記入するプレースホルダー | 追加する |
| B-2 | 「ハーネス設計の方針」 | お願いベース(CLAUDE.md)と強制ルール(settings.jsonのpermissions/hooks)の置き場所の分け方の説明 | 追加する |
| B-3 | 「作業の可視化ルール」 | 【目的】【操作】を宣言してからBash/Edit/Write/削除を行う運用(良い例/悪い例付き)。グローバルの同名ルール(A-12相当)と同内容 | 追加する |
| B-4 | 「プランモード運用」 | 複数ファイル変更時は`docs/plans/`にプランdocを保存(`/plan-doc`コマンドで雛形作成)、実績追記、逸脱時は再承認。※C-2・C-3のファイル追加が前提 | 追加する |
| B-5 | 「Push・デプロイ方針」 | git push常時deny/ブランチ運用(feature branch + Vercel Preview)/push前チェックリスト/初回pushチェックリスト/本番障害時のロールバック手順 | 追加する |
| B-6 | 「テスト方針」への追記 | post-edit.sh(編集直後の自動lint/型チェック)と`npm run verify`による2段階自動検証の説明を追加(既存の3項目はそのまま残す) | 追加する |

---

## C. talentManagement 由来の候補(ファイル・settings.json)

| # | 内容 | 変更対象 | 連動する項目 | repository-001の現状を調査した結果 | 判断 |
|---|---|---|---|---|---|
| C-1 | `audit-log.sh` の追加 | 新規: `.claude/hooks/audit-log.sh`(Bash/Edit/Write/MultiEditの実行内容を`.claude/logs/tool-audit.jsonl`に事実ベースで記録) | C-4, C-7 | 競合なし。`jq`(スクリプトの依存)はインストール済み(jq-1.8.1)。`.claude/logs/`は現状存在しない | 追加しない|
| C-2 | `plan-doc.md` の追加 | 新規: `.claude/commands/plan-doc.md`(プランdoc雛形作成コマンド) | B-4, C-3 | **要検討**: 既存の`docs/plans/`配下の22件のプランdocは、いずれも自由記述の構成(`# タイトル` → `## Context` → `## 変更内容` 等)で、talentManagement の `_template.md` が要求する「目的/変更対象ファイル一覧/やらないこと/リスク・影響範囲/検証方法/実績」という固定セクション構成には従っていない。導入すると**今後のプランdocの型が変わる**(既存22件を遡って直す必要はないが、書式が変わる) | 追加しない|
| C-3 | `_template.md` の追加 | 新規: `docs/plans/_template.md`(プランdocのテンプレート) | B-4, C-2 | C-2と同じ。新しい固定フォーマットを導入することになる | 追加しない|
| C-4 | `.gitignore` 追記 | `.claude/logs/` を追加(C-1の出力先を誤ってコミットしないため) | C-1 | 競合なし。現在の`.gitignore`に`.claude/logs/`のエントリはない | 追加しない|
| C-5 | permissions追加(env/migrations) | `.claude/settings.json` deny に `Edit(./.env)` `Edit(./.env.*)` `Write(./.env)` `Write(./.env.*)` `Edit(./prisma/migrations/**)` `Write(./prisma/migrations/**)` | — | 競合なし。`prisma/migrations/`配下に適用済みマイグレーション9件が実在する(保護対象として妥当)。マイグレーション作成は`npx prisma migrate dev`(Bashで実行されるprisma CLIがファイルを生成)であり、ClaudeのEdit/Writeツールを経由しないため、このdenyを追加しても通常のマイグレーション作成フローは塞がれない | 追加しない|
| C-6 | permissions追加(rm -rf/vercel) | `.claude/settings.json` deny に `Bash(rm -rf *)` `Bash(vercel --prod*)` `Bash(vercel deploy --prod*)` | — | **矛盾あり**: repository-001 の `.claude/README.md`(39-41行目)には既に「`rm -rf`のような汎用コマンドのdenyは書き方の変形(`rm -r -f`等)で素通りするため過信できない。破壊的操作は具体的なコマンド単位(prisma reset等)で塞ぐ方針」という**「rm -rfの汎用denyを意図的に入れない」という明文化された設計方針**が書かれている。`Bash(rm -rf *)`を追加するとこの方針と矛盾するため、追加するならREADME.mdの当該記述も書き換える必要がある。一方 `vercel --prod*` 系のdenyは具体的なコマンド単位のdenyであり、既存方針と矛盾しない(スクリプト内にvercel CLI呼び出しは見つからず、`.mcp.json`のvercel MCPはHTTP接続でBash経由ではないため無関係)。**rm -rfとvercelを分けて判断することを推奨** | 追加しない|
| C-7 | hooks追加(audit-log) | `.claude/settings.json` PostToolUse に audit-log.sh を登録(matcher: `Bash\|Edit\|Write\|MultiEdit`) | C-1 | C-1と同じく競合なし | 追加しない|
| C-8 | hooks変更(matcher拡張) | 既存 post-edit.sh の matcher を `Edit\|Write` → `Edit\|MultiEdit\|Write` に拡張(MultiEditで自動lint/型チェックが素通りする穴を塞ぐ)。**既存設定の変更であり単純追加ではない点に注意** | — | **効果なし(実質no-op)の可能性**: 現在のClaude Codeのツール一覧を確認したところ`MultiEdit`という単体ツールは存在しない(`Edit`ツールに統合済み)。そのため`MultiEdit`をmatcherに追加しても、現状のツール構成では発火対象が増えない可能性が高い。将来的な後方互換のための追記として残す価値はあるが、「穴を塞ぐ」という当初の効果は現時点では見込めない | 追加しない|
| C-9 | HARNESS.md 追記 | 上記で採用した項目をディレクトリツリー・hooks説明・permissions説明に追記(既存の記述は残す) | 採用したC項目に応じて内容変動 | C-6を採用する場合、README.mdの「rm -rf過信しない」という既存の補足説明(39-41行目)との整合を取る編集が追加で必要 | 追加しない|
| C-10 | README.md 追記 | 上記で採用した項目をpermissions表・hooks表に追記(既存の記述は残す) | 採用したC項目に応じて内容変動 | 同上(C-6採用時は既存の補足説明の書き換えが必要) | 追加しない|

---

## E. 追加のhooks候補(グローバル由来・settings.json / 全て判断確定: 追加する)

ハッカソンでのpush後、審査員の環境にはグローバル設定(`~/.claude/`)が
存在しないため、「グローバルにしか無いhooks」も repository-001 側の
`settings.json`・`hooks/`に複製して自己完結させる。以下は具体的な変更内容。

### E-1. `notify.sh` に StopFailure対応・チャットタイトル抽出を追加

`.claude/hooks/notify.sh` を以下の内容に置き換える(コメント・処理の骨格は
repository-001版を維持し、グローバル版にある機能を追加する形):

```bash
#!/usr/bin/env bash
# =============================================================
# notify.sh — 完了・エラー終了・確認待ちの Windows 通知フック
# 対象環境: Windows + VSCode + WSL2 (Ubuntu) で Claude Code を実行している構成。
#
# 紐付けているイベント (settings.json 参照):
#   Stop         … Claude が応答を完了したとき(=作業完了)
#   StopFailure  … APIエラーでターンが終わったとき
#   Notification … Claude が許可や入力を待っているとき(=確認待ち)
#
# 仕組み: WSL2 内の notify-send は Windows に届かないため、
# WSL の相互運用機能で Windows 側の powershell.exe (toast-notify.ps1) を呼び出し、
# 追加インストールなしでトースト通知を表示する。
# toast-notify.ps1 はこのリポジトリの .claude/hooks/ に同梱しており、
# グローバル設定が無い環境でもこのリポジトリ単体で通知機能が動く。
#
# このフックは「通知するだけ」なので、失敗しても Claude の動作を
# 妨げないよう、どの経路でも必ず exit 0 で終わる。
# =============================================================
set -uo pipefail

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

input=$(cat)
event=$(jq -r '.hook_event_name // empty' <<<"$input")
transcript_path=$(jq -r '.transcript_path // empty' <<<"$input")

# --- 疑似チャットタイトルの抽出 ----------------------------------
# Stop/Notificationの入力JSONにはセッションの表示タイトルに相当する
# フィールドが無いため、transcriptの最初のユーザー発言の冒頭を代用タイトルに使う。
chat_title=""
if [[ -n "$transcript_path" && -f "$transcript_path" ]]; then
  chat_title=$(jq -r '
    select(.type=="user" and ((.isSidechain // false)==false))
    | .message.content
    | if type=="string" then .
      else ([.[]? | select(.type=="text") | .text] | join(" "))
      end
    | .[0:40]
  ' "$transcript_path" 2>/dev/null | head -n 1)
fi

case "$event" in
  Stop)
    title="Claude Code - 完了"
    msg="作業が完了しました"
    ;;
  StopFailure)
    title="Claude Code - エラー終了"
    error_type=$(jq -r '.error_type // "unknown"' <<<"$input")
    msg="APIエラーで終了しました (${error_type})"
    ;;
  Notification)
    title="Claude Code - 確認待ち"
    msg=$(jq -r '.message // "確認・入力を待っています"' <<<"$input")
    ;;
  *)
    title="Claude Code"
    msg="通知"
    ;;
esac

if [[ -n "$chat_title" ]]; then
  title="${title} [${chat_title}]"
fi

# PowerShellのシングルクォート文字列に安全に埋め込むため、
# タイトルとメッセージから引用符・改行を除去する(コマンド注入対策)。
msg=$(tr -d "'\"\r\n" <<<"$msg")
title=$(tr -d "'\"\r\n" <<<"$title")

printf '\a'

ps_exe=""
if command -v powershell.exe >/dev/null 2>&1; then
  ps_exe="powershell.exe"
elif [[ -x "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe" ]]; then
  ps_exe="/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
else
  command -v notify-send >/dev/null 2>&1 && notify-send "$title" "$msg"
  exit 0
fi

# リポジトリ同梱の toast-notify.ps1 を呼ぶ(プロジェクト相対パス。
# hooksはプロジェクトルートを cwd として実行される)。
"$ps_exe" -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w "$PWD/.claude/hooks/toast-notify.ps1")" -Title "$title" -Message "$msg" >/dev/null 2>&1

exit 0
```

### E-2.(項目6)`toast-notify.ps1` をリポジトリに同梱

新規: `.claude/hooks/toast-notify.ps1`(グローバル版と同一内容。汎用的な
パラメータ化スクリプトのため無変更でそのまま移植できる):

```powershell
param(
    [string]$Title = "Claude Code",
    [string]$Message = "Notification",
    [string]$AppId = "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe"
)

[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.UI.Notifications.ToastNotification, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$textNodes = $template.GetElementsByTagName("text")
$textNodes.Item(0).AppendChild($template.CreateTextNode($Title)) | Out-Null
$textNodes.Item(1).AppendChild($template.CreateTextNode($Message)) | Out-Null

$toast = [Windows.UI.Notifications.ToastNotification]::new($template)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($AppId).Show($toast)
```

### E-3. `settings.json` に `StopFailure` hookエントリを追加

既存の `Stop` エントリと同じ形で追加(E-1のnotify.shが `StopFailure` も処理するため):

```json
"StopFailure": [
  { "hooks": [{ "type": "command", "command": "bash .claude/hooks/notify.sh" }] }
]
```

### E-4. `settings.json` に `PreToolUse` リマインダー hookを追加

既存の `PreToolUse`(matcher: `Bash` → pre-bash-env-guard.sh)の配列に、以下を追加
(matcherが異なるため別エントリとして追加。既存のBashエントリは残す):

```json
{
  "matcher": "Edit|Write|MultiEdit",
  "hooks": [
    {
      "type": "command",
      "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"additionalContext\":\"リマインダー: このEdit/Write操作の対象ファイルと作業内容を、日本語でチャットに一言宣言しましたか？していなければ、これから宣言してから進めてください。\"}}'"
    }
  ]
}
```

### E-5. `settings.json` に `PermissionRequest` 審査 hookを追加

新規セクションとして追加:

```json
"PermissionRequest": [
  {
    "matcher": "Bash",
    "hooks": [
      {
        "type": "prompt",
        "prompt": "あなたはBashコマンド実行前の説明を審査するレビュアーです。以下のフック入力JSON(tool_input.command が実行予定のコマンド、tool_input.description がClaudeによる説明文)を見て、description が次の3点をすべて満たしているか判定してください。\n1. 目的: なぜこのコマンドが必要か\n2. 内容: 具体的に何をするか\n3. 言語: 日本語で書かれている(英語のみの説明は不合格)\n\ndescription が空、コマンドの単なる言い換え、「実行します」等の説明になっていない一般的な文言のみ、または英語のみで書かれている場合は不合格です。目的と内容の両方が日本語で一言でも読み取れれば合格とします。\n\nフック入力:\n$ARGUMENTS\n\n判定結果だけを、他の文章を一切付けずに以下のいずれか1行のJSONで出力してください。\n合格の場合: {\"continue\": true}\n不合格の場合: {\"hookSpecificOutput\": {\"hookEventName\": \"PermissionRequest\", \"permissionDecision\": \"deny\", \"permissionDecisionReason\": \"descriptionを日本語で、目的(なぜ)と内容(何を)を一言ずつ追加して再実行してください\"}, \"reason\": \"descriptionが目的・内容の説明不足、または日本語で書かれていません\"}",
        "model": "claude-haiku-4-5-20251001",
        "timeout": 20,
        "statusMessage": "説明内容を確認中..."
      }
    ]
  }
]
```

### E-6. `HARNESS.md` / `.claude/README.md` への追記

E-1〜E-5で追加した hooks(StopFailure・チャットタイトル・toast-notify.ps1同梱・
PreToolUseリマインダー・PermissionRequest審査)を、既存の説明表・ディレクトリ
ツリーに追記する(既存の記述は残す)。実際の文面は実装時に確定する。

---

## D. (参考・変更しない前提)repository-001 が独自に持つ内容

前回確認済みの通り、以下は「repository-001が独自に発展させた内容」であり、
今回の追加対象ではない。念のため一覧化(判断不要、現状維持がデフォルト)。

| # | 内容 | 備考 |
|---|---|---|
| D-1 | notify.sh 経由のStop/Notification hook | グローバル側にも同種hookがあり2重通知になるが、ユーザー確認済みで現状維持 |
| D-2 | pre-bash-env-guard.sh / post-exit-plan-mode.sh / design-review-agent.md / infra-agent.md | talentManagementには無い repository-001 独自の資産。削除・変更しない |
| D-3 | implement-screen.md・new-screen/SKILL.mdの「開発サーバー起動」手順 | talentManagementは削除済みだが、repository-001は残す(独自に進んでいる側なので変更不要) |
| D-4 | `docs/tech-conventions.md`/`docs/dev-commands.md`への分割構成 | talentManagement独自の再構成。repository-001のCLAUDE.md一枚構成は維持し、新セクションのみ追記する想定 |

---

## 次のステップ

1. ~~上表の「判断」列(A・B・C)に `追加する`/`追加しない`/`保留` を記入~~ 完了
2. ~~記入内容に基づき、作業順番を確定し、実際の編集内容(diff相当)を提示~~ 完了(Eセクション追加を含む)
3. ~~編集を実施~~ 完了
4. ~~整合性チェック(JSON構文・実行権限)~~ 完了
5. 差分をユーザーに提示し、`git add`→`git commit` の明示的指示を得る ← 次はここ
6. コミット後、`git push` の明示的指示を得てから実行する

---

## 実績

**プラン通りだった点:**
- A(グローバルルール由来の11項目)は全て「追加する」の通り、`CLAUDE.md` の
  「運用ルール」セクションとして追記した
- B(talentManagement由来の6セクション)は全て「追加する」の通り `CLAUDE.md` に
  追記した。B-4は事前合意通り `/plan-doc` コマンド・`_template.md` への参照を外し、
  repository-001 の実運用(`docs/plans/` の自由記述形式)に合わせて調整した
- C(audit-log.sh・permissions拡張・matcher拡張など10項目)は全て「追加しない」の
  通り、一切変更していない(`audit-log.sh`・`plan-doc.md`・`_template.md` は
  作成せず、settings.json の permissions も無変更)
- E(notify.sh拡張・toast-notify.ps1同梱・PreToolUseリマインダー・
  PermissionRequest審査)は全て「追加する」の通り、提示したコード通りに実装した

**逸脱した点とその理由:**
- D-1(notify.shのStop/Notification hook)は当初「変更しない」としていたが、
  対話の中で再検討し、E-1・E-3として StopFailure対応・チャットタイトル抽出・
  toast-notify.ps1の同梱を追加することになった。理由: ハッカソン提出後、
  審査員の環境にはグローバル設定(`~/.claude/`)が存在しないため、通知機能も
  リポジトリ単体で自己完結させる必要があると判断したため
- グローバル版の notify.sh は `~/.claude/hooks/toast-notify.ps1`
  (ホームディレクトリ配下)を呼ぶ設計だったが、そのままではリポジトリを
  pushしても動かないため、`toast-notify.ps1` を `.claude/hooks/` に同梱し、
  notify.sh もプロジェクト相対パス(`$PWD/.claude/hooks/toast-notify.ps1`)を
  呼ぶよう変更した(計画時点でE-2として合意済みの対応)

**未実施の点:**
- `git add` / `git commit` / `git push` は未実施(グローバルルールにより
  明示的な指示がある場合のみ実行するため)。差分の最終確認後、指示を待っている状態

**変更したファイル(最終確定):**
- 新規: `.claude/hooks/toast-notify.ps1`
- 編集: `.claude/hooks/notify.sh`、`.claude/settings.json`、`CLAUDE.md`、
  `HARNESS.md`、`.claude/README.md`
- 変更なし(Cで不採用と確定): `.claude/hooks/audit-log.sh`、
  `.claude/commands/plan-doc.md`、`docs/plans/_template.md`、`.gitignore`
