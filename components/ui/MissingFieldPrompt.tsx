// mypage(私の経歴書)専用: 未入力項目を赤字の警告調ではなく前向きな促し表示にする。
// resume-detail・pdf-preview(他人の閲覧・PDF出力)では使わない。
export function MissingFieldPrompt() {
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-text">
      ＋ 入力してください
    </span>
  );
}
