export type BreadcrumbNode = { label: string; parentPath: string | null };

// 論理階層はURLのネスト構造と必ずしも一致しない(例: /register は /mypage の子だが、
// URLパスとしては兄弟)ため、URLから自動導出せず明示的なマップで管理する。
export const BREADCRUMB_MAP: Record<string, BreadcrumbNode> = {
  "/": { label: "トップ", parentPath: null },
  "/mypage": { label: "マイページ", parentPath: "/" },
  "/register": { label: "基本情報登録", parentPath: "/mypage" },
  "/career-summary": { label: "経歴概要・自己PR登録", parentPath: "/mypage" },
};

export type BreadcrumbItem = { label: string; path: string };

// ルート→現在地の順で返す。未登録パスは空配列(パンくず非表示、安全側のフォールバック)。
export function getBreadcrumbTrail(pathname: string): BreadcrumbItem[] {
  const trail: BreadcrumbItem[] = [];
  let current: string | null = pathname;

  while (current) {
    const node: BreadcrumbNode | undefined = BREADCRUMB_MAP[current];
    if (!node) return [];
    trail.unshift({ path: current, label: node.label });
    current = node.parentPath;
  }

  return trail;
}
