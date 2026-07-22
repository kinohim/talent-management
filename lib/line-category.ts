// HeartRails Express APIは路線名の文字列(例:「JR山手線」「東京メトロ丸ノ内線」)しか
// 返さず、運営会社種別・カテゴリの情報を持たない。そのため路線名の文字列パターンから
// 分類するヒューリスティックとする。未知の私鉄・第三セクター路線は「私鉄・その他」に
// 入る前提で、完全な正解を保証するものではない(docs/decisions.md参照)。
export type LineCategory = "JR" | "地下鉄" | "私鉄・その他" | "モノレール・新交通" | "新幹線";

export const LINE_CATEGORIES: readonly LineCategory[] = [
  "JR",
  "地下鉄",
  "私鉄・その他",
  "モノレール・新交通",
  "新幹線",
];

// 路線名に「地下鉄」「メトロ」を含まない地下鉄路線(都営4路線)
const SUBWAY_LINE_ALLOWLIST = new Set(["都営浅草線", "都営三田線", "都営新宿線", "都営大江戸線"]);

// キーワード・個別リストのいずれにも一致しないモノレール・新交通路線
const MONORAIL_NEW_TRANSIT_ALLOWLIST = new Set(["ゆりかもめ", "アストラムライン", "山万ユーカリが丘線"]);

export function categorizeLine(lineName: string): LineCategory {
  if (lineName.includes("新幹線")) return "新幹線";
  if (
    /モノレール|新交通|新都市交通|ライナー/.test(lineName) ||
    MONORAIL_NEW_TRANSIT_ALLOWLIST.has(lineName)
  ) {
    return "モノレール・新交通";
  }
  if (lineName.includes("JR")) return "JR";
  if (/地下鉄|メトロ/.test(lineName) || SUBWAY_LINE_ALLOWLIST.has(lineName)) return "地下鉄";
  return "私鉄・その他";
}

export function groupLinesByCategory(lines: string[]): Record<LineCategory, string[]> {
  const grouped = Object.fromEntries(
    LINE_CATEGORIES.map((category) => [category, [] as string[]]),
  ) as Record<LineCategory, string[]>;

  for (const line of lines) {
    grouped[categorizeLine(line)].push(line);
  }

  return grouped;
}
