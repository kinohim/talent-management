# 023 ヘッダー共通ナビゲーション追加・トップ画面の管理者メニュー順序変更

## 目的

共通ヘッダー(`app/(authenticated)/layout.tsx`)に主要画面への導線を常時表示し、ロールに応じて表示を出し分ける(docs/screens.md「ヘッダの共通ナビゲーション」参照)。あわせてトップ画面の管理者メニュー内の「マスタ管理」「アカウント一覧」の並び順を入れ替える。

## 対象リンクとロール表示条件

`components/home/HomeTiles.tsx` の既存ロール定義を踏襲する。

| ラベル | 遷移先 | 表示ロール |
|---|---|---|
| 業務経歴書(既存表記) | `/` | 全ロール(ブランド表記をトップへのリンクに変更) |
| 私の経歴書 | `/mypage` | 一般社員, 管理職 |
| 経歴書一覧 | `/resumes` | 全ロール |
| ダッシュボード | `/skill-map` | 全ロール |
| マスタ管理 | `/master` | 管理職 |
| アカウント一覧 | `/accounts` | 管理職 |

## 実装内容

- `components/layout/HeaderNav.tsx`(新規): ロールでフィルタしたナビリンクを返す `getHeaderNavLinks(role)` と、それを描画する `HeaderNav` コンポーネント。`HomeTiles.tsx` のロールフィルタパターンを踏襲
- `app/(authenticated)/layout.tsx`: ヘッダーの「業務経歴書」表記を`/`へのLinkに変更し、`HeaderNav`をブランドリンクの隣に配置。幅が狭い画面での折り返しに対応
- `components/home/HomeTiles.tsx`: `ADMIN_TILE_DEFS`の並びを「マスタ管理」→「アカウント一覧」に変更(表示ロジックは変更なし)
- `docs/screens.md`: ヘッダーの共通ナビゲーションの存在とロール別表示ルールを追記

## テスト

`components/layout/HeaderNav.test.ts`: `getHeaderNavLinks()`の一般社員・人事営業・管理職それぞれのロールでの表示リンクを検証

## 検証結果

- `npm run verify`(lint + tsc + vitest)全項目通過
- Playwrightで一般社員(000002)・人事営業(000006)・管理職(000001)それぞれのログインでヘッダー表示リンクが仕様通りであることを確認
- ヘッダーからのリンク遷移、モバイル幅(390px)でのヘッダー折り返し表示を確認
- トップ画面の管理者メニューで「マスタ管理」→「アカウント一覧」の順で表示されることを確認

## 追記: マスタ管理のドロップダウンサブメニュー追加

ヘッダーの「マスタ管理」に、フォーカス/ホバーでmaster-homeと同じ5画面(部署／スキル／資格／現場ポジション／現場)へのドロップダウンを表示し、各画面へ直接遷移できる導線を追加した(「マスタ管理」自体のクリックは`/master`への遷移という従来動作を維持)。

### 実装内容

- `lib/master-nav-items.ts`(新規): マスタ画面5項目(`key`/`label`/`href`)の配列 `MASTER_NAV_ITEMS` を新設。`app/(authenticated)/master/page.tsx` のタイル一覧(`MASTER_TILES`)をこの配列の参照に置き換え、重複定義を解消
- `components/layout/HeaderNav.tsx`: `NavLinkDef` に任意の `children` を追加し、「マスタ管理」エントリに `MASTER_NAV_ITEMS` を設定。`children` を持つリンクは `group` + `group-hover`/`group-focus-within` のCSSのみでドロップダウンを表示(クライアントコンポーネント化はしない)
- `components/layout/HeaderNav.test.ts`: 「マスタ管理」の `children` が `MASTER_NAV_ITEMS` と一致することを検証するテストを追加
- `docs/screens.md`: 「ヘッダの共通ナビゲーション」の説明にドロップダウン仕様を追記

### 検証結果

- `npm run verify`(lint + tsc + vitest)全項目通過
- Playwrightで、マウスホバー・キーボードフォーカス(Tab)の両方でドロップダウンが開閉すること、5項目それぞれが正しい画面(`/master/organization-units`等)へ遷移すること、フォーカスを外すと閉じること、「マスタ管理」自体のクリックは`/master`へ遷移する既存動作を維持していることを確認
