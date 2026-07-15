# REF008 スキルマップ／組織ダッシュボード改修計画

## Context

`docs/dashboard-design.md`（設計書）と `docs/dashboard_mockup.html`（UI・集計ロジックの仕様を兼ねるモック）に基づき、既存の REF008（`/skill-map`）を「資格・スキル・ヒートマップの3タブ構成ダッシュボード」に全面改修する。目的は (1) 資格取得アンケートの廃止（リアルタイム集計）、(2) 組織のスキル・資格保有状況の可視化、(3) 個人の目標設定のヒント提供。

現状の `/skill-map` は「組織ツリーのラジオ選択＋スキル別/資格別保有者数リスト」の簡素な実装。今回はモックと同等の見た目・挙動（KPI・🎉ティッカー・ドーナツ構成比・💡おすすめ・年度推移・ヒートマップ）に置き換える。

### ユーザー確認済みの決定事項

1. **事業部タブ/行は配下すべてを含む**（事業部選択＝配下の部・Gr所属者を含めて集計。ヒートマップでは事業部行と部行で同一社員が重複して現れることを許容）
2. **保有者名チップは現行どおり `canViewEmployeeResume` 判定で REF003（`/resumes/{employeeId}`）へのリンクを出し分ける**
3. **`docs/screens.md` の REF008 節も新仕様に書き換える**

### 実装前に確定した仕様解釈（設計書の「事前確認事項」への回答）

- **取得日未登録は存在しない**: `employee_certification.acquired_date` は NOT NULL（schema.prisma:391）。除外ロジックは不要
- **カテゴリの実体**: `skill_category` / `certification_category` の独立マスタ（動的取得。マスタ追加で自動的にチップが増える）
- **事業部・部と階層レベル**: `organization_unit.unit_level` の `DIVISION` / `DEPARTMENT`（`GROUP` はタブ・行に出さず親の部にロールアップ）
- **組織未所属（`organization_unit_id` NULL）の社員**: 全社集計には含めるが、部署タブ・ヒートマップ行には現れない
- **今年度取得が0件の場合**: ティッカーは「今年度の取得はまだありません」を表示（モックは常に1件以上の前提のため補完）

### ユーザー指示によるモックからの変更点

- **ティッカーはフェード切替ではなく、右から左へ途切れずに流れるマーキー表示**にする（CSS アニメーションで連続ループ。ホバーで一時停止は維持、NEWバッジも維持。右端カウンタは「全◯件（今年度）」の固定表示に変更）
- **ヒートマップの縦軸（部署行）は表示/非表示を切り替え可能**にする（部署の選択チップ等で行単位にON/OFF。最低1行は表示）
- **ヒートマップの部署行はドラッグで並び替え可能**にする（行ヘッダをクリックしたまま上下に動かして順番を変更。クライアント状態のみで永続化はしない）
- **集計対象社員**: 現行と同じ `deletedAt: null` かつ `isRegistered: true` かつ `employmentStatus: ACTIVE`

## アーキテクチャ

データ量が小さく（社員30名規模）、保有者名は全社公開のため、**Server Component で全データを一括取得・整形し、フィルタ操作はすべてクライアント側で行う**（モックJSと同じ構造。フィルタごとのサーバー往復なし）。

```
app/(authenticated)/skill-map/page.tsx   … Server Component: auth → Prisma一括取得 → DTO整形
components/skill-map/Dashboard.tsx       … "use client": 状態（大タブ・部署・カテゴリ・表示切替・選択年度）
components/skill-map/…                   … Ticker / 構成比(ドーナツ) / 年度推移 / ヒートマップ / フィルタ部品
lib/skill-map.ts                         … 純関数の集計ロジック(全面書き換え) + vitest
```

- チャートライブラリは導入しない。ドーナツ＝CSS `conic-gradient`、棒グラフ・ヒートマップ＝div/table＋Tailwind（モックと同じ手法。既存も Tailwind 自前バー）
- モックの CSS 変数（#3357d6 系の配色・角丸・余白）を Tailwind v4 のクラス/任意値で再現する

## 変更ファイル

### 1. `lib/skill-map.ts` 全面書き換え（+ `lib/skill-map.test.ts`）

クライアントからも import するため **Prisma 非依存の純関数のみ**とする（`lib/organization-unit-tree.ts` と同じ方針）。モックJSの関数と同一ロジックで実装:

- `fiscalYear(date)` … 年度＝3/1〜翌2月末（モック `fy()`）。DATE型はUTC getterで読む（decisions.md「日時とタイムゾーン」）
- `isNewAcquisition(date, today)` … 直近3か月（92日）以内（モック `isNew()`）。today はJST基準の「今日」
- `buildDepartmentBuckets(units)` … 部署タブ・ヒートマップ行の定義。「全社」＋ DIVISION・DEPARTMENT をツリー順（`buildOrganizationUnitTree` を再利用）で列挙。各バケットの対象 unitId 集合は `collectDescendantIds` で**配下すべて**（事業部＝配下の部・Gr含む、部＝配下Gr含む）
- `collectComposition(items, 選択カテゴリ, 選択部署)` … 保有者数降順→上位5＋その他（モック `collect()` + `renderComposition` の集約部）
- `recommendCertifications(certs, myCertIds, scope)` … 非保有×スコープ内2名以上×上位3件、ツールチップ文言生成（モック `recommendMap()`）
- `trendAxisMax(certs)` … 全社・全カテゴリの年度別最大件数を5の倍数へ切り上げ（モック `TREND_AXIS_MAX`。フィルタで不変）
- `trendBuckets(currentFy)` … `〜(FY-5)` ＋ FY-4〜FY の6バケット
- `aggregateTrend(...)` / `acquisitionsIn(bucket, ...)` … 年度別件数（カテゴリ内訳つき）と、年度クリック時の取得一覧（取得日降順・絞り込み反映）（モック `renderTrend` のデータ部 + `acquisitionsIn()`）
- `heatmapGross(...)` … 延べ件数（同一人物の複数保有を重複カウント。モック `gross()`）と保有率（延べ÷在籍人数、100%超許容）、濃淡5段階の閾値判定
- KPI・ティッカー用: 今年度取得一覧（取得日降順）の抽出

既存の `parseSkillMapUnitId` / `aggregateSkillHolders` / `aggregateCertificationHolders` は新ロジックに置き換えて削除。テストも書き換え（年度境界 2/28↔3/1、NEW判定境界、最後の1カテゴリOFF不可はUI側、上位5＋その他、おすすめの2名以上・上位3件・自保有除外、縦軸固定、延べ人数・100%超保有率などを網羅）。

### 2. `app/(authenticated)/skill-map/page.tsx` 書き換え

- 認証・ガード（`auth()` → `resolveDestination`）は現行踏襲
- Prisma 一括取得（N+1回避、`select` 最小化）:
  - `organizationUnit`（deletedAt: null）→ バケット構築
  - `employee`（現行と同じフィルタ）＋ `employeeCertifications`（deletedAt: null、`certificationId`・`acquiredDate`）＋ `employeeSkills`（deletedAt: null、`skillId`）
  - `certification`＋`certificationCategory`、`skill`＋`skillCategory`（既存の `lib/certification-options.ts` / `lib/skill-options.ts` を流用可能なら流用）
- ログインユーザーの保有資格 id 集合（💡おすすめ用）と、社員ごとの `canViewEmployeeResume` 判定（現行 page.tsx:75-83 のロジック踏襲）をサーバーで解決して DTO に含める
- JST基準の「今日」をサーバーで確定して DTO で渡す（`lib/date-format.ts` の既存JSTユーティリティを利用）
- 整形済み DTO（部署バケット・カテゴリ・資格/スキル＋保有者(氏名・部署名・canView・取得日)・KPI・ティッカー items・trendAxisMax）を `<Dashboard>` に渡す

### 3. `components/skill-map/` 作り直し

- 削除: `OrganizationUnitRadioFilter.tsx`・`SkillHolderList.tsx`（skill-map 専用、他画面から未参照）
- 新規（いずれも `"use client"` は Dashboard 配下のみ）:
  - `Dashboard.tsx` … 大タブ［資格｜スキル｜ヒートマップ］と全フィルタ状態
  - `AcquisitionTicker.tsx` … 右→左に途切れず流れるマーキー（CSS keyframes でコンテンツを2周分並べたシームレスループ）・ホバー一時停止・NEWバッジ・「全◯件（今年度）」カウンタ・0件時プレースホルダ
  - `DeptTabs.tsx` / `CategoryChips.tsx` … 横スクロール（`overflow-x-auto`・折り返しなし）、チップは✓表示・最後の1つOFF不可
  - `CompositionPanel.tsx` … ドーナツ（conic-gradient）＋凡例（クリックで保有者チップ展開、氏名リンク出し分け、その他行、空状態「該当する登録がありません」）、💡ツールチップ、ビュー別注記
  - `TrendPanel.tsx` … 縦軸固定・目盛り線・積み上げ/単色棒・今年度強調・棒クリックで取得一覧（再クリックで閉じる）
  - `HeatmapPanel.tsx` … ［資格｜スキル］×［人数｜保有率］、行＝全社の事業部・部、列＝選択カテゴリ、横スクロール、濃淡5段階、延べ人数の注記。加えて:
    - **行の表示/非表示切替**: 部署チップで行単位にON/OFF（最低1行は表示）
    - **行のドラッグ並び替え**: 行ヘッダを掴んで上下に動かすと順番が変わる（pointer events で自前実装、ライブラリ追加なし。並び順・表示状態はクライアント状態のみで永続化しない）
- ヘッダーKPI「資格保有 ◯件 ▲ +◯件（前年度末比）」はページ見出し行に配置

### 4. ドキュメント更新

- `docs/screens.md` REF008 節を新仕様（3タブ構成・KPI・ティッカー・フィルタ・おすすめ・ヒートマップ・全社公開・氏名リンクは閲覧範囲判定）に書き換え（改訂経緯は書かない）
- 実装完了後、本計画を `docs/plans/` へファイル化（コミットはユーザー指示待ち）

### 実装しないもの（設計書どおり）

検索ボックス・集計ボタン・統計カード行・Excel出力・属人化リスク一覧・選択外カテゴリの「その他」集約・登録フォーム。モックの「サンプルA〜C」部署も実装対象外。

## 検証

1. `npm run verify`（prisma generate → ESLint → tsc → vitest）
2. `npm run dev` を起動し、ui-check（Playwright）で確認:
   - 3タブ切替・部署タブ/カテゴリチップの動作（最後の1つOFF不可含む）
   - KPI・ティッカー表示（マーキーが途切れず流れ、ホバーで停止するか。NEW/今年度判定がシードの取得日と整合するか）
   - ドーナツ凡例クリックで保有者展開、閲覧範囲内のみ氏名がリンク
   - 年度推移の縦軸固定（部署・カテゴリ変更で目盛り不変）・棒クリックで取得一覧
   - ヒートマップ4パターン切替・注記表示・横スクロール・行の表示/非表示切替・ドラッグ並び替え
   - コンソールエラーなし
3. 受け入れ条件チェックリスト（dashboard-design.md 末尾）を1項目ずつ照合
4. 開発サーバーは手動確認用に起動したままにする
