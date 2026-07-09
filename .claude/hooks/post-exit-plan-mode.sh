#!/usr/bin/env bash
# =============================================================
# post-exit-plan-mode.sh — PostToolUse フック(ExitPlanMode)
# Planモードで計画が承認された直後に発火する。
#
# 「計画の実装が完了したタイミング」自体はこのフックからは検知できない
# (実行完了はClaudeの判断に委ねられるタイミングのため)。そこで承認直後に
# additionalContextでリマインダーを注入し、実装完了時にClaudeが必ず
# 「docs/plans/へファイル化するか」をユーザーに確認するよう仕込む。
# =============================================================
set -uo pipefail

cat <<'JSON'
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "この計画の実装が完了したら、docs/plans/にMarkdownファイルとして保存するかどうかを必ずユーザーに確認すること(無断でファイル化しない)。ユーザーが保存を希望した場合のみdocs/plans/配下にファイルを作成する。git commitは別途ユーザーの明示的な指示があるまで行わない。"
  }
}
JSON
