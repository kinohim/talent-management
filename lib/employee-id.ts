// account-new: 社員IDの初期値の採番。既存の最大社員ID(6桁数字文字列)+1を
// 6桁ゼロ埋めで返す。あくまで初期表示用で、管理職が上書き入力できる。
// 社員IDは全行(退職者・論理削除済み含む)でユニークなため、最大値は
// 削除済みを除外せずに求めること。
export function nextEmployeeId(maxEmployeeId: string | null): string {
  if (!maxEmployeeId || !/^\d{6}$/.test(maxEmployeeId)) return "000001";
  const next = Number(maxEmployeeId) + 1;
  if (next > 999999) return "999999"; // 6桁の上限(実運用では到達しない)
  return String(next).padStart(6, "0");
}
