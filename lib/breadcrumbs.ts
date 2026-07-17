export type BreadcrumbNode = { label: string; parentPath: string | null };

// 論理階層はURLのネスト構造と必ずしも一致しない(例: /basic-info は /mypage の子だが、
// URLパスとしては兄弟)ため、URLから自動導出せず明示的なマップで管理する。
export const BREADCRUMB_MAP: Record<string, BreadcrumbNode> = {
  "/": { label: "トップ", parentPath: null },
  "/mypage": { label: "私の経歴書", parentPath: "/" },
  "/basic-info": { label: "基本情報登録", parentPath: "/mypage" },
  // "/mypage?tab=projects"はパンくずの親リンク専用の合成キー(実パスは/mypage)。
  // プロジェクト経歴の登録・編集からは実績タブへ戻すために使う。
  "/mypage?tab=projects": { label: "私の経歴書", parentPath: "/" },
  "/projects/new": { label: "プロジェクト経歴登録", parentPath: "/mypage?tab=projects" },
  "/projects/[id]": { label: "プロジェクト経歴編集", parentPath: "/mypage?tab=projects" },
  "/resumes": { label: "経歴書一覧", parentPath: "/" },
  "/resumes/[id]": { label: "経歴書詳細", parentPath: "/resumes" },
  "/resumes/[id]/pdf-preview": { label: "PDF出力プレビュー", parentPath: "/resumes/[id]" },
  // 一覧の「PDF」発(?from=list)の合成キー。遷移元に応じて戻り・パンくずの
  // 上位を出し分ける(docs/screens.md pdf-preview「戻る導線」)
  "/resumes/[id]/pdf-preview?from=list": { label: "PDF出力プレビュー", parentPath: "/resumes" },
  "/mypage/pdf-preview": { label: "PDF出力プレビュー", parentPath: "/mypage" },
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

// マップキー(正規化パス)を入力pathnameの実セグメントに復元する。動的ルート
// (/resumes/[id]等)が親ノードになるとき、正規化パスのままではリンク先が
// 壊れるため(/resumes/[id]という実在しないURL)、キーと同じセグメント数の
// 実パス先頭部分の正規化がキーに一致する場合のみ実値へ差し戻す。
// クエリ付きキーはパス部分のみ復元してクエリを付け直す(親リンク専用の
// 合成キー /mypage?tab=projects はパス部分に[id]がないためそのまま返る)。
function restoreActualPath(mapKey: string, pathname: string): string {
  const [keyPath, query] = mapKey.split("?");
  if (!keyPath.includes("[id]")) return mapKey;
  const keySegments = keyPath.split("/");
  const actualSegments = pathname.split("/");
  if (keySegments.length > actualSegments.length) return mapKey;
  const candidate = actualSegments.slice(0, keySegments.length).join("/");
  if (normalizePathname(candidate) !== keyPath) return mapKey;
  return query ? `${candidate}?${query}` : candidate;
}

// ルート→現在地の順で返す。未登録パスは空配列(パンくず非表示、安全側のフォールバック)。
// options.from: 遷移元クエリ(?from=)。「正規化パス?from=<値>」の合成キーが
// マップにある画面のみ起点を切り替える(それ以外の画面では無視する)。
export function getBreadcrumbTrail(
  pathname: string,
  options?: { from?: string | null },
): BreadcrumbItem[] {
  const normalized = normalizePathname(pathname);
  const fromKey = options?.from ? `${normalized}?from=${options.from}` : null;
  const trail: BreadcrumbItem[] = [];
  let current: string | null =
    fromKey && BREADCRUMB_MAP[fromKey] ? fromKey : normalized;

  while (current) {
    const node: BreadcrumbNode | undefined = BREADCRUMB_MAP[current];
    if (!node) return [];
    trail.unshift({ path: restoreActualPath(current, pathname), label: node.label });
    current = node.parentPath;
  }

  return trail;
}
