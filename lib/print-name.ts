// pdf-preview(PDF出力プレビュー)の氏名イニシャル生成(docs/screens.md pdf-preview)。

// カタカナ頭文字→ヘボン式ローマ字の1文字目。行単位のグループで定義し、
// シ→S(shi)・チ→C(chi)・ツ→T(tsu)・フ→F(fu)・ジ/ヂ→J・ヅ→Z(zu)・
// ヲ→O(o)・ヴ→V の特殊音は個別グループで上書きする。
// マップにない文字(ン・長音符ー・小書き・カタカナ以外)は変換不可(null)。
// 拗音(キャ等)は先頭の親文字(キ→K)で解決されるため個別対応は不要。
const INITIAL_GROUPS: [string, string][] = [
  ["A", "ア"],
  ["I", "イ"],
  ["U", "ウ"],
  ["E", "エ"],
  ["O", "オヲ"],
  ["K", "カキクケコ"],
  ["G", "ガギグゲゴ"],
  ["S", "サシスセソ"],
  ["Z", "ザズゼゾヅ"],
  ["J", "ジヂ"],
  ["T", "タツテト"],
  ["C", "チ"],
  ["D", "ダデド"],
  ["N", "ナニヌネノ"],
  ["H", "ハヒヘホ"],
  ["F", "フ"],
  ["B", "バビブベボ"],
  ["P", "パピプペポ"],
  ["M", "マミムメモ"],
  ["Y", "ヤユヨ"],
  ["R", "ラリルレロ"],
  ["W", "ワ"],
  ["V", "ヴ"],
];

const KANA_TO_INITIAL = new Map<string, string>(
  INITIAL_GROUPS.flatMap(([letter, kanas]) =>
    [...kanas].map((kana) => [kana, letter] as const),
  ),
);

// カナ(姓 名)から「Y.T」(姓.名)形式のイニシャルを生成する。
// 姓名2語に分割できない・頭文字が変換不可の場合はnullを返す
// (pdf-preview側でイニシャル選択肢を非活性化するシグナル)。
export function initialsFromKana(
  nameKana: string | null | undefined,
): string | null {
  const tokens = (nameKana ?? "")
    .split(/[\s　]+/)
    .filter((token) => token.length > 0);
  if (tokens.length !== 2) return null;

  const initials = tokens.map((token) => KANA_TO_INITIAL.get(token[0]) ?? null);
  if (initials.some((initial) => initial == null)) return null;
  return initials.join(".");
}
