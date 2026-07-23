# CLAUDE.md

経歴書 Web アプリ(PWA)。Next.js App Router + Prisma + Neon + Auth.js 構成。

<!--
このファイルの役割:
セッション開始時に Claude へ自動で読み込まれる「プロジェクトの前提知識」。
ここに書くのは「お願いベース」の指示であり、強制力は hooks より弱い。
破られては困るルールは .claude/settings.json (permissions/hooks) 側に置く。
肥大化してきたら @docs/xxx.md 形式の import で分割する。
-->

## 誰をどんな笑顔にするか

- ターゲット(誰の): <!-- 人間が記入 -->
- 課題(どんな困りごとを): <!-- 人間が記入 -->
- 解決(どう解決して笑顔にするか): <!-- 人間が記入 -->

## 技術スタック

- Next.js 16 (App Router) / React 19 / TypeScript 5
- 認証: Auth.js (next-auth v5) + @auth/prisma-adapter (SSO 対応)
- DB/ORM: Prisma 7 + Neon PostgreSQL (@prisma/adapter-neon)
- スタイル: Tailwind CSS v4
- テスト: Vitest / Lint: ESLint 9 (eslint-config-next)
- パッケージマネージャ: npm

## プロジェクトドキュメント

<!--
@ 付きは毎セッション自動で全文読み込みされる import。
コンテキスト節約のため、常時必要な「全体像」だけを import し、
詳細仕様はパス参照に留めて、必要なタスクのときだけ読みに行かせる。
-->

@docs/README.md

以下は必要になったタスクの開始時に読むこと(常時読み込みはしない):

- `docs/schema.md` — DB スキーマ全 19 テーブルの定義。**スキーマや Prisma モデルに
  触れる変更の前には必ず読むこと**
- `docs/screens.md` — 全 18 画面の仕様。画面の新規実装・修正の前に該当画面の節を読むこと
- `docs/er-diagram.md` — ER 図 (Mermaid)。テーブル間のリレーションを確認したいとき
- `docs/screen-flow.md` — 画面遷移図 (Mermaid)。導線に関わる変更のとき
- `docs/decisions.md` — 設計判断の経緯。**既存の設計に疑問を持ったり変更を提案する前に、
  まずここに理由が書かれていないか確認すること**

仕様と実装が食い違っている場合は、勝手にどちらかに合わせず、どちらが正か人間に確認する。

## 運用ルール

- 常に日本語で応答する
- 既存ファイルの追記・編集・削除に着手する前に、どのファイルをどう直すか方針を一度説明し確認を得る。承認後は、その方針に沿った一連の編集は都度確認せず続けてよい(ただし削除・上書きは次項により都度確認が必要)
- ファイル削除・上書き、`git reset --hard`、force push などの破壊的操作は、実行前に内容を説明し、ユーザーの確認を取ってから行う
- `git commit` / `git push` は明示的に指示された場合のみ行う。push の許可はその回限りとし、別の変更が加わった場合は改めて確認する
- PR作成・Issueへのコメントなど、他者から見える操作もgit commit/pushと同様に明示的に指示された場合のみ行う
- npm install/uninstall など依存パッケージの追加・削除は、実行前に内容を説明し確認を得る
- `--no-verify`、`--force` など検証やhookをスキップするフラグは使わない
- 指示された範囲を超えたリファクタリング・機能追加・抽象化はしない
- コメントは自明でない意図(WHY)がある場合のみ、簡潔に記載する
- 新規ファイル作成より既存ファイルの編集を優先する
- 判断が分かれる、または不明な点はユーザーに確認する

## ハーネス設計の方針

なぜこのルールがあるか: CLAUDE.md の指示は長い会話の中で薄れることがあるが、
permissions・hooks は機械的に強制されるため、ルールの性質に応じて置き場所を分けている。

- **LLM への誘導(お願いベース)は CLAUDE.md・`.claude/skills` に書く**。文脈判断が
  必要で、破られても致命的でないルールが対象
- **確定的に強制したいルールは `.claude/settings.json` の permissions・hooks に置く**
  (例: `.env` の読み書き禁止、`prisma db push` 禁止、`git push` 禁止、編集直後の自動 lint/型チェック)
- 常時読み込みが必要な最小限の情報だけを `@docs/xxx.md` で import し、詳細は
  タスク開始時にオンデマンドで読ませることで、このファイル自体の肥大化を防ぐ
- 全体の連動フロー・ファイル構成は `HARNESS.md` を参照

## 作業の可視化ルール

なぜこのルールがあるか: 操作の意図をその都度言語化させることで、暴走や意図しない
変更を早期に発見できるようにするため。

Bash コマンドの実行、ファイルの作成・編集・削除を行う前に、
**必ず**以下の形式で説明を出力すること。説明なしにツールを実行してはならない。

【目的】なぜこの操作が必要か(1行)
【操作】何をするか(コマンド名 / 対象ファイルと変更内容の要約)

万が一、宣言を忘れたことに実行後に気づいた場合は、その場で【目的】【操作】を説明する。

### 良い例
【目的】依存パッケージの脆弱性を確認するため
【操作】npm audit を実行

【目的】ログイン時のnullエラーを修正するため
【操作】auth.ts の validateUser 関数に null チェックを追加

### 悪い例
(何も説明せずいきなり Edit ツールを使う)

## プランモード運用

なぜこのルールがあるか: 複数ファイルにまたがる変更は、計画と実績の記録が
再現性と説明責任の担保になるため。

**プランドキュメントの閾値方式:**
- 複数ファイルにまたがる変更、または新機能の追加 →
  プランを `docs/plans/YYYY-MM-DD-NN-要約.md` として保存する
  (既存の `docs/plans/` 配下のファイルと同じ形式・命名で作成する)
- 軽微な修正(1ファイル・小規模) → チャット上のプラン提示のみでよい

**プランに含める内容の目安:** 目的(Context)/ 変更内容 / 必要に応じて
リスクや検証方法。既存の `docs/plans/` 配下のファイルの構成を参考にする

**実績追記:** 作業完了時、プランdocの末尾に「## 実績」セクションを追記する
(プラン通りだった点 / 逸脱した点とその理由 / 未実施の点)

**逸脱ルール:** 承認済みプランに含まれない変更が必要になったら、作業を止めて報告し、
プランを更新して再承認を得る。勝手に進めない

**コミットの実行タイミング**は人間が判断し、Claude が自律的にコミットを実行することは
ない(粒度・分割・メッセージ書式は `.claude/commands/commit.md` 参照)

## Push・デプロイ方針

なぜこのルールがあるか: push は Vercel の自動デプロイに直結する不可逆性の高い操作
のため、実行主体・手順・切り戻し方法を明確にしておく。

### 基本ルール
- `git push` は permissions で常に deny。Claude は実行できず、必ず人間が行う
- push は Vercel の自動デプロイに直結するため、「push = デプロイ操作」として扱う

### ブランチ運用
- 初回 push のみ main に直接 push する(Vercel 連携の初期セットアップのため)
- **以降の変更はすべて feature ブランチで行う**
  - ブランチ名: `feature/変更内容の要約`(例: `feature/login-form`)
  - feature ブランチを push すると Vercel が Preview 環境を自動生成する
  - Preview URL で動作確認 → 問題なければ main にマージ → 本番反映
- Claude はブランチの作成・コミットまでを行い、push とマージの実行は人間が行う

### push 前チェックリスト(毎回)
1. `npm run verify`(lint + 型 + テスト)が通ること
2. `npm run build` が通ること
   ※ verify に本番ビルドは含まれないため、必ず別途実行する
3. ローカルブラウザで変更箇所の動作確認
4. main へのマージ後は、本番 URL でも動作確認するまでを 1 セットとする

### 初回 push 前チェックリスト(1回だけ)
1. `.env` 系ファイルが `.gitignore` に含まれていることを確認
2. 過去のコミット履歴に `.env` 系が一度も含まれていないことを確認
   (`git log --all --full-history -- .env*` で確認。含まれていた場合は
   push 前に履歴から除去し、記載されていたキーはローテーションする)
3. Vercel 側の環境変数設定を push より先に完了させる
   (先に push すると初回ビルドが失敗、または不完全な状態で公開される)

### 本番で問題が起きたとき
1. まず Vercel ダッシュボードの Instant Rollback で直前のデプロイに戻す
2. その後、feature ブランチで修正 → Preview 確認 → main にマージ
3. 慌てて main に直接修正 push しない(切り分けが困難になるため)

## 検証(最重要)

<!-- 検証の単一入口。人間・Claude・CI がすべて同じコマンドを使う -->

- コードを変更したら、タスク完了前に必ず `npm run verify` を実行して全項目を通すこと
- verify の内訳: prisma generate → ESLint → tsc --noEmit → vitest run
- 機械的に直せるスタイル違反は `npm run lint:fix` で自動修正してよい
- 編集直後の lint/型チェックは hook が自動実行する。エラーが返ってきたら
  その場で修正してから次の作業に進むこと

## よく使うコマンド

```
npm run dev              # 開発サーバー
npm run verify           # フル検証 (lint + 型 + テスト)
npm run lint:fix         # 自動修正可能な lint 違反の修正
npx vitest run <path>    # 特定ファイルのテストのみ実行
npx prisma migrate dev --name <name>   # マイグレーション作成・適用
npx prisma generate      # schema 変更後のクライアント再生成
```

## コーディング規約

<!-- 「Claude が迷いがち・間違えがちな点」に絞って書く。一般論は書かない -->

- Server Components をデフォルトとし、`"use client"` は
  インタラクションが必要なコンポーネントに限定する
- データ取得は Server Component / Server Actions / Route Handler で行い、
  Prisma Client をクライアントコンポーネントから import しない
- Prisma Client は `lib/prisma.ts` のシングルトンを必ず経由する
  (サーバーレス環境でのコネクション枯渇防止)
- 認証チェックは `auth()` (Auth.js v5) を使う。`getServerSession` は v4 の API なので使わない
- スキーマ変更は必ず `prisma migrate dev` で行う (`db push` は禁止)
- Tailwind v4 を使用。`tailwind.config.js` ベースの v3 の書き方
  (`@tailwind base` 等) ではなく CSS ファーストの `@import "tailwindcss"` を使う
- 環境変数 (.env) の内容を読んだり、コードや会話に貼り付けたりしない

## テスト方針

なぜこのルールがあるか: 「AI に手伝わせる」よりも「自動で品質が守られる仕組み」に
近いほど、確認漏れに依存しない品質担保ができるため。

**仕組み(2段階の自動検証):**
- 編集直後: PostToolUse hook(`.claude/hooks/post-edit.sh`)が編集ファイルの ESLint と
  プロジェクト全体の `tsc --noEmit` を自動実行し、失敗内容がその場でフィードバックされる
- タスク完了前: 必ず `npm run verify` を実行して全項目(prisma generate → ESLint →
  tsc --noEmit → vitest run)を通すこと。機械的に直せるスタイル違反は
  `npm run lint:fix` で自動修正してよい

**書き方:**
- 新しいロジック (ユーティリティ、Server Actions、API) には Vitest のテストを追加する
- テストファイルは対象と同じディレクトリに `*.test.ts(x)` として置く
- DB 依存のテストはモックを使い、実際の Neon には接続しない

## ディレクトリ構成

<!-- 実装が進んだら実態に合わせて更新すること -->

```
app/            # App Router (ページ・レイアウト・Route Handler)
components/     # 共有 UI コンポーネント
lib/            # prisma シングルトン、auth 設定、ユーティリティ
prisma/         # schema.prisma、マイグレーション
docs/           # 仕様書 (スキーマ・画面・設計判断。上記「プロジェクトドキュメント」参照)
scripts/        # verify.sh 等の開発スクリプト
```

---

このプロジェクトの開発ハーネス(hooks・permissions・コマンド等)の全体像と
設計思想は `HARNESS.md` にまとまっている(主に人間向けの説明)。

## Git操作のルール

- git commit, git push は必ずユーザーの明示的な許可を得てから実行すること
- 許可なく自動でコミット・プッシュしてはいけない
