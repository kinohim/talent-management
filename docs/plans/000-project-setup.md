# 000 プロジェクトセットアップ

## 目的

経歴書Webアプリの開発基盤(フレームワーク・検証ツール・開発ハーネス)を整備し、以後のすべてのplanが同じ検証手順で品質を担保できる状態を作る。

## 前提(依存するplan)

なし(最初のplan)。

## 実装内容

- Next.js 16(App Router) + React 19 + TypeScript 5 のプロジェクト初期化(`app/`ディレクトリ構成、パッケージマネージャはnpm)
- Tailwind CSS v4 の導入。CSSファースト方式(`app/globals.css`で`@import "tailwindcss"`)とし、`tailwind.config.js`ベースのv3方式は使わない
- ESLint 9(eslint-config-next)+ Vitest の導入。テストは対象と同じディレクトリに`*.test.ts(x)`を置く方針
- 検証スクリプト`scripts/verify.sh`と`npm run verify`(prisma generate → ESLint → tsc --noEmit → vitest run)の整備
- `npm run lint:fix`(自動修正)、`npm run dev`(開発サーバー)の整備
- ディレクトリ構成の骨格: `app/`(ページ・Route Handler)、`components/`(共有UI)、`lib/`(ユーティリティ)、`prisma/`、`docs/`、`scripts/`

## 受け入れ基準

- `npm run dev`で開発サーバーが起動し、プレースホルダーページが表示される
- `npm run verify`が全項目グリーンで完走する
- Tailwind v4のユーティリティクラスがページに適用される

## 検証方法

1. `npm run verify`を実行し、lint・型チェック・テストがすべて通ることを確認する
2. `npm run dev`でトップページを開き、コンソールエラーがないことを確認する
