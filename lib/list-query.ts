// resume-list(経歴書一覧)/account-list(アカウント一覧)共通の、一覧のページング・
// ソート指定をURLのsearchParamsからパースする純粋関数群。
// DBクエリ(skip/take/orderBy)はページ側のServer Componentで組み立てる。

export const PAGE_SIZES = [10, 30, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 30;

export type SortOrder = "asc" | "desc";

export type Pagination = { page: number; pageSize: number };

type SearchParamsInput = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePagination(searchParams: SearchParamsInput): Pagination {
  const rawPage = Number(first(searchParams.page));
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;

  const rawPageSize = Number(first(searchParams.pageSize));
  const pageSize = (PAGE_SIZES as readonly number[]).includes(rawPageSize)
    ? rawPageSize
    : DEFAULT_PAGE_SIZE;

  return { page, pageSize };
}

export type SortSpec<T extends string> = {
  sortKey: T | null;
  order: SortOrder;
};

// sortが許可リスト外(または未指定)の場合はデフォルトソート(sortKey=null)。
export function parseSort<T extends string>(
  searchParams: SearchParamsInput,
  allowedKeys: readonly T[],
): SortSpec<T> {
  const rawSort = first(searchParams.sort);
  const sortKey = (allowedKeys as readonly string[]).includes(rawSort ?? "")
    ? (rawSort as T)
    : null;
  const order: SortOrder = first(searchParams.order) === "desc" ? "desc" : "asc";
  return { sortKey, order };
}

// 総件数確定後にページ番号を実在範囲へ丸め、skipを計算する。
// (検索条件の変更で件数が減った際、空ページではなく最終ページを表示するため)
export function clampPage(
  page: number,
  totalCount: number,
  pageSize: number,
): { page: number; skip: number; pageCount: number } {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const clamped = Math.min(Math.max(1, page), pageCount);
  return { page: clamped, skip: (clamped - 1) * pageSize, pageCount };
}
