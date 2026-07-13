export type BreadcrumbNode = { label: string; parentPath: string | null };

// 論理階層はURLのネスト構造と必ずしも一致しない(例: /register は /mypage の子だが、
// URLパスとしては兄弟)ため、URLから自動導出せず明示的なマップで管理する。
export const BREADCRUMB_MAP: Record<string, BreadcrumbNode> = {
  "/": { label: "トップ", parentPath: null },
  "/mypage": { label: "マイページ", parentPath: "/" },
  "/register": { label: "基本情報登録", parentPath: "/mypage" },
  "/career-summary": { label: "経歴概要・自己PR登録", parentPath: "/mypage" },
  "/skills": { label: "スキル登録", parentPath: "/mypage" },
  "/certifications": { label: "資格登録", parentPath: "/mypage" },
  "/projects": { label: "プロジェクト経歴一覧", parentPath: "/mypage" },
  "/projects/new": { label: "プロジェクト経歴登録", parentPath: "/projects" },
  "/projects/[id]": { label: "プロジェクト経歴編集", parentPath: "/projects" },
  "/resumes": { label: "経歴書一覧", parentPath: "/" },
  "/resumes/[id]": { label: "経歴書詳細", parentPath: "/mypage" },
  "/skill-map": { label: "スキルマップ/組織ダッシュボード", parentPath: "/" },
  "/master": { label: "マスタ管理", parentPath: "/" },
  "/master/organization-units": { label: "部署マスタ管理", parentPath: "/master" },
  "/master/skills": { label: "スキルマスタ管理", parentPath: "/master" },
  "/master/certifications": { label: "資格マスタ管理", parentPath: "/master" },
  "/master/project-roles": { label: "現場ポジションマスタ管理", parentPath: "/master" },
  "/master/sites": { label: "現場マスタ管理", parentPath: "/master" },
  "/accounts": { label: "アカウント一覧", parentPath: "/" },
  "/accounts/new": { label: "新規アカウント登録", parentPath: "/accounts" },
  "/accounts/[id]": { label: "アカウント編集", parentPath: "/accounts" },
};

export type BreadcrumbItem = { label: string; path: string };

// 動的ルート(/projects/123等)の数値セグメントを`[id]`に正規化してからマップ照合
// する。現在地(末尾)はリンクにならない表示専用の値のため、実在しない合成パスを
// 割り当てても問題ない。
function normalizePathname(pathname: string): string {
  return pathname.replace(/\/\d+(?=\/|$)/g, "/[id]");
}

// ルート→現在地の順で返す。未登録パスは空配列(パンくず非表示、安全側のフォールバック)。
export function getBreadcrumbTrail(pathname: string): BreadcrumbItem[] {
  const trail: BreadcrumbItem[] = [];
  let current: string | null = normalizePathname(pathname);

  while (current) {
    const node: BreadcrumbNode | undefined = BREADCRUMB_MAP[current];
    if (!node) return [];
    trail.unshift({ path: current, label: node.label });
    current = node.parentPath;
  }

  return trail;
}
