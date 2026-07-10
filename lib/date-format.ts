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
