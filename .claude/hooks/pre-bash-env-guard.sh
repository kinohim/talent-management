#!/usr/bin/env bash
# =============================================================
# pre-bash-env-guard.sh — PreToolUse フック(Bash)
# Bash コマンド経由での .env 系ファイルへのアクセスをブロックする。
#
# 背景: permissions の deny `Read(./.env)` は Read ツールしか塞げず、
# `cat .env` や `grep X .env` のような Bash 経由の読み取りは素通りする。
# 「破られては困るルールは hooks で強制する」方針(HARNESS.md)に従い、
# コマンド文字列に .env 系ファイルへの参照を見つけたら実行前に拒否する。
#
# 終了コードの意味(PreToolUse):
#   exit 0 … 実行を許可
#   exit 2 … 実行をブロックし、stderr の内容を Claude にフィードバック
#
# 例外: .env.example(秘密情報を含まないテンプレート)は許可する。
# なお `process.env` のようなコード中の表現は、`.env` の直前が
# 単語文字のため誤検知しない(下の境界文字クラスで判定)。
#
# 限界(ベストエフォート): 文字列マッチのため、glob(`cat .en?` 等)や
# 変数の間接参照など、`.env` の文字列が現れない迂回は防げない。
# このフックは「うっかり読む」事故の防止層であり、最後の砦は
# CLAUDE.md の規約と人間のレビュー(HARNESS.md の deny 過信への注記と同方針)。
# =============================================================
set -uo pipefail

# jq がなければ判定不能。post-edit.sh と同様、ブロックせず素通りさせる
# (.env を守る最後の砦は CLAUDE.md の規約と人間のレビュー)。
if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

cmd=$(jq -r '.tool_input.command // empty')
[[ -z "$cmd" ]] && exit 0

# 「行頭 or 空白・引用符・=・/ ・( ・: 」に続く .env(.拡張子) を抽出する。
# 直前に単語文字がある process.env などはマッチしない。
hits=$(grep -oE "(^|[[:space:]\"'=/(:])\.env(\.[A-Za-z0-9_.-]+)?" <<<"$cmd" \
  | grep -oE "\.env(\.[A-Za-z0-9_.-]+)?" || true)

[[ -z "$hits" ]] && exit 0

# .env.example 以外への参照が1つでもあればブロック
if grep -qvE '^\.env\.example$' <<<"$hits"; then
  echo ".env 系ファイルへの Bash 経由のアクセスはブロックされています(秘密情報の漏出防止)。.env.example のみ参照可能です。.env の実値の確認・変更が必要な場合は人間に依頼してください。" >&2
  exit 2
fi

exit 0
