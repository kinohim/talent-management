# 日時表示の JST 固定化(タイムゾーン全体見直し)

## Context

アカウント一覧(REF007)の「最終ログイン日時」が日本時間で表示されない不具合が報告された。本システムは利用者が日本人のみ・日本国内利用のため、**ユーザー向けの日時表示はすべて JST(Asia/Tokyo)固定**とするのが正しい。

調査の結果、直接原因は `lib/date-format.ts` の `toDisplayDateTime` が実行環境のローカルタイムゾーン(`getHours()` 等)に依存していること。呼び出し元の `components/accounts/AccountTable.tsx` は Server Component であり、サーバー(Vercel/Node)は UTC で動作するため UTC 表示になる。`TZ` 環境変数もリポジトリ内のどこにも設定されていない(開発マシンの WSL は JST のためローカルでは再現しない)。

網羅調査により、同様に実行環境 TZ に依存する箇所が他に 3 箇所見つかった。日付のみ(`@db.Date`)系のパース・表示(`parseDateOnly`/`parseYearMonth`/`toDisplayDate`/`toDisplayYearMonth`/`toDateInputValue`/`toMonthInputValue`)は UTC 基準で一貫しており変更不要。PDF/Excel 出力は未実装(プレースホルダのみ)のため対象外。

## 方針

環境変数 `TZ=Asia/Tokyo` に頼らず、**コード側で明示的に JST 固定**にする(環境非依存でテスト可能、ローカル開発と Vercel で挙動が一致するため)。JST は夏時間がないため固定オフセット +9 時間で安全。

`lib/date-format.ts` に JST ヘルパーを追加し、各箇所をそれ経由に統一する:

```ts
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
// UTC瞬間をJSTの壁時計に読み替えたDate(getUTC*系で読み出す)
function toJstClock(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET_MS);
}
```

## 変更内容

### 1. `lib/date-format.ts` — `toDisplayDateTime` を JST 固定に(不具合本体)

`getHours()/getMonth()` 等のローカル getter を、`toJstClock()` 後の `getUTC*` getter に置き換える。出力形式(`YYYY年M月D日 HH:mm`)は現状維持。あわせて `todayJstDateOnly()`(JST の今日を UTC 深夜の Date として返す)と `nowJstClock()` を新設。

### 2. `lib/career-text-prompt.ts` — `formatYearMonth` の修正

対象値は `@db.Date`(UTC 深夜保存)なのにローカル getter を使っていたため、UTC getter に修正。形式は `YYYY/MM` で `toDisplayYearMonth`(`YYYY年M月`)と異なるため関数統合はしない。

### 3. `lib/certification-schema.ts` — 「本日以前」判定を JST の今日に

従来はローカル getter で「今日」を作っており、UTC サーバーでは JST 0:00〜8:59 の間 1 日前にずれる(JST の今日に取得した資格が「未来日」と誤判定される)。`todayJstDateOnly()` に置き換え。

### 4. `lib/experience-years.ts` — 経験年数計算の「現在」を JST 基準に

継続中案件の月数カウントの「今の年月」が UTC 基準だと JST 月初 0:00〜8:59 に 1 ヶ月ずれるため、`nowJstClock()` を渡すよう修正。

### 5. テスト更新・追加

- `lib/date-format.test.ts`: 旧テストはローカル TZ で構築・検証しており TZ 非依存で常に通る(不具合を検出できない)ため、固定 UTC 瞬間 → JST 表示を検証する形に書き換え。JST で日付が繰り上がるケース、`todayJstDateOnly`/`nowJstClock` のテストを追加。
- `lib/certification-schema.test.ts`: `vi.setSystemTime` で UTC/JST の日付境界(UTC 20:00 = JST 翌日 5:00)を固定し、JST の今日を許容・JST の明日を拒否することを検証。
- `lib/career-text-prompt.test.ts`: テストデータの日付構築をローカルから `Date.UTC` に修正(実データの DATE 型と同じ表現に)。

### 6. `docs/decisions.md` — 「日時とタイムゾーン」の設計判断を追記

JST 固定表示・TIMESTAMPTZ は保存 UTC/表示 JST・DATE 型は UTC 深夜保存/UTC getter 表示・サーバー側の「今日」判定は JST 基準、という最終仕様と理由を記録。

## 対象ファイル

| ファイル | 変更 |
|---|---|
| `lib/date-format.ts` | JST ヘルパー追加、`toDisplayDateTime` 修正 |
| `lib/date-format.test.ts` | JST 検証テストに書き換え・追加 |
| `lib/career-text-prompt.ts` | `formatYearMonth` を UTC getter に修正 |
| `lib/career-text-prompt.test.ts` | テストデータを UTC 構築に修正 |
| `lib/certification-schema.ts` | 「今日」判定を JST 基準に |
| `lib/certification-schema.test.ts` | JST 境界ケースのテスト追加 |
| `lib/experience-years.ts` | 「現在」を JST 基準に |
| `docs/decisions.md` | タイムゾーン方針の追記 |

表示側(`AccountTable.tsx` 等)の呼び出しコードは変更不要。DB の値(UTC 保存)や `lastLoginAt` の記録処理(`lib/auth.ts`)も正しく変更不要。

## 検証

1. `npm run verify`(prisma generate → ESLint → tsc → vitest)全項目通過(テスト 343 件)
2. 本番相当の再現として `TZ=UTC` で開発サーバーを起動し、Playwright でアカウント一覧を確認 → 最終ログインが JST のまま表示されること(修正前ならこの環境で UTC 表示になっていた)。コンソールエラーなし
3. 通常環境でもアカウント一覧の JST 表示を確認

## 補足(対象外の気づき)

最終ログイン列を降順ソートすると未ログイン(`-`)の行が先頭に来る(PostgreSQL の NULL 順序仕様)。本対応の範囲外として未修正。
