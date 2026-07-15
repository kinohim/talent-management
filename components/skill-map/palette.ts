// REF008ダッシュボードの配色(docs/dashboard_mockup.htmlのCSS変数を移植)。
// カテゴリはマスタ追加で増えるため、固定の割当てではなく並び順で循環させる。

export const ACCENT = "#3357d6";
export const ACCENT_SOFT = "#eef1fd";

// ドーナツの上位5項目
export const DONUT_PALETTE = ["#3357d6", "#5c7cf0", "#8fa6f5", "#c2cffa", "#dbe3fb"];
// 「その他」(上位5以外)
export const REST_COLOR = "#e6e8f0";

// 年度推移の積み上げ棒のカテゴリ色(カテゴリの並び順で割当て)
const CATEGORY_COLORS = ["#3357d6", "#5c7cf0", "#c2cffa", "#8fa6f5", "#dbe3fb", "#26398a"];

export function categoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

// ヒートマップの濃淡5段階(level 0〜4)
export const HEAT_LEVELS = [
  { background: "#f3f4f8", color: "#b0b4c0" },
  { background: "#dbe3fb", color: "#3d55b8" },
  { background: "#aebffa", color: "#26398a" },
  { background: "#5c7cf0", color: "#ffffff" },
  { background: "#3357d6", color: "#ffffff" },
] as const;
