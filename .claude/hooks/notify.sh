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

# --- 入力の解釈 -------------------------------------------------
# フックへの入力は stdin の JSON。jq がなければ通知を諦めて素通り。
if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

input=$(cat)
event=$(jq -r '.hook_event_name // empty' <<<"$input")
transcript_path=$(jq -r '.transcript_path // empty' <<<"$input")

# --- 疑似チャットタイトルの抽出 ----------------------------------
# Stop/Notification の入力JSONにはチャット(セッション)の表示タイトルに
# 相当するフィールドが無いため、transcript の最初のユーザー発言の冒頭を
# 代用タイトルとして使う。取得できなければタイトルなしで続行する。
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

# イベントごとに通知文を組み立てる。
# Notification イベントには message フィールド(例: 「◯◯の実行許可が必要です」)
# が入ってくるので、あればそれを使う。
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

# PowerShell のシングルクォート文字列に安全に埋め込むため、
# タイトルとメッセージから引用符・改行を除去する(コマンド注入対策)。
msg=$(tr -d "'\"\r\n" <<<"$msg")
title=$(tr -d "'\"\r\n" <<<"$title")

# --- ターミナルベル(保険) --------------------------------------
# VSCode のターミナルはベルを受けるとタブにドットを表示する。
# トーストが何らかの理由で失敗しても最低限の合図は残るようにする。
printf '\a'

# --- powershell.exe の場所を特定 --------------------------------
# 通常は WSL の PATH に powershell.exe が通っている(Windows 相互運用)。
# /etc/wsl.conf で appendWindowsPath=false にしている環境向けに
# フルパスのフォールバックも用意する。
ps_exe=""
if command -v powershell.exe >/dev/null 2>&1; then
  ps_exe="powershell.exe"
elif [[ -x "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe" ]]; then
  ps_exe="/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
else
  # WSL 以外の環境(素の Linux 等)で使われた場合は notify-send を試す
  command -v notify-send >/dev/null 2>&1 && notify-send "$title" "$msg"
  exit 0
fi

# --- Windows トースト通知 ----------------------------------------
# リポジトリ同梱の toast-notify.ps1 を呼ぶ(プロジェクトルート相対パス。
# hooks はプロジェクトルートを cwd として実行される)。
"$ps_exe" -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w "$PWD/.claude/hooks/toast-notify.ps1")" -Title "$title" -Message "$msg" >/dev/null 2>&1

# 通知の成否に関わらず Claude の動作は止めない
exit 0
