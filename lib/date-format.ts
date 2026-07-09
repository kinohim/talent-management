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

// employee.graduation_year_monthはYYYYMM01形式で保存する規約(docs/schema.md)
export function parseYearMonth(value: string): Date {
  const [y, m] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}
