export function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function toMonthInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 7); // YYYY-MM
}

// <input type="date">の"YYYY-MM-DD"をUTC日付として解釈する
// (ローカルタイムゾーンでの文字列パースによる日付ズレを避けるため)
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// <input type="month">の"YYYY-MM"を月初日のUTC日付として解釈する
// (employee.graduation_year_month・project.start_date/end_date等、年月を
// DATE型で保存する各カラムで共通利用する)
export function parseYearMonth(value: string): Date {
  const [y, m] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

// 日精度の日付を表示用の日本語形式にする(resume-detail等の閲覧専用画面向け)
export function toDisplayDate(date: Date | null | undefined): string {
  if (!date) return "";
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

// 年月精度の日付を表示用の日本語形式にする(resume-detail等の閲覧専用画面向け)
export function toDisplayYearMonth(date: Date | null | undefined): string {
  if (!date) return "";
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月`;
}

// 利用者は日本人のみのため、日時表示はサーバー・クライアントの実行環境の
// タイムゾーンに依存せずJST固定とする(docs/decisions.md参照)。
// JSTは夏時間がないため固定オフセット+9時間で安全。
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// UTC瞬間をJSTの壁時計に読み替えたDateを返す(getUTC*系で読み出すこと)
function toJstClock(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET_MS);
}

// JSTでの「今日」をUTC深夜のDateとして返す(DATE型カラムとの比較用)
export function todayJstDateOnly(now: Date = new Date()): Date {
  const jst = toJstClock(now);
  return new Date(
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()),
  );
}

// JSTでの現在時刻の壁時計をUTC getterで読めるDateとして返す
// (経験年数計算など「今の年月」をJST基準で求める用途向け)
export function nowJstClock(now: Date = new Date()): Date {
  return toJstClock(now);
}

// 日時(TIMESTAMPTZ)を表示用の日本語形式にする(account-listの最終ログイン等)。
// DATE型のtoDisplayDate等(UTC深夜保存)と異なり、UTC瞬間をJSTに変換して表示する。
export function toDisplayDateTime(date: Date | null | undefined): string {
  if (!date) return "";
  const jst = toJstClock(date);
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${jst.getUTCFullYear()}年${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日 ${hh}:${mm}`;
}
