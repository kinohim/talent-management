// 一覧画面(REF002/REF007)の検索条件・ソート・ページはURLのsearchParamsに
// 載っているため、詳細・編集画面へ遷移して「〜に戻る」リンク(クエリなしの
// 固定パス)で戻ると絞り込みが解除されてしまう。これを防ぐため、一覧画面の
// 最新クエリをsessionStorageに記憶し、戻り先リンク(BackLink/パンくず)で
// 復元する。記憶はタブ単位・ブラウザセッション内のみ。

const LIST_QUERY_PATHS = ["/resumes", "/accounts"] as const;

function storageKey(pathname: string): string {
  return `listQuery:${pathname}`;
}

export function isListQueryPath(pathname: string): boolean {
  return (LIST_QUERY_PATHS as readonly string[]).includes(pathname);
}

export function saveListQuery(pathname: string, search: string): void {
  if (!isListQueryPath(pathname)) return;
  try {
    if (search) {
      sessionStorage.setItem(storageKey(pathname), search);
    } else {
      sessionStorage.removeItem(storageKey(pathname));
    }
  } catch {
    // ストレージ不可の環境では記憶しない(絞り込み復元が効かないだけ)
  }
}

// 記憶済みクエリがあれば「?」付きで返す(リンクhrefへの連結用)
export function restoreListQuery(pathname: string): string {
  if (!isListQueryPath(pathname)) return "";
  try {
    const stored = sessionStorage.getItem(storageKey(pathname));
    return stored ? `?${stored.replace(/^\?/, "")}` : "";
  } catch {
    return "";
  }
}
