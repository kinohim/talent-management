// 卒業年月の予測(basic-info・mypageの基本情報セクション: 卒業年月カレンダーの初期表示に使う)。
// 学年の区切り(4月始まり)を考慮し、大学卒業相当の年の3月を返す:
// - 1〜3月生まれ(早生まれ): 生年+22年の3月
// - 4〜12月生まれ: 生年+23年の3月
// 生年月日が不完全な場合はnullを返す(初期表示しない)。
export function predictGraduationYearMonth(birthDate: string): string | null {
  const matched = /^(\d{4})-(\d{2})/.exec(birthDate);
  if (!matched) return null;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  if (month < 1 || month > 12) return null;
  const graduationYear = month <= 3 ? year + 22 : year + 23;
  return `${graduationYear}-03`;
}
