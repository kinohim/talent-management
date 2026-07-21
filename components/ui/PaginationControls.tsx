"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PAGE_SIZES } from "@/lib/list-query";

type PaginationControlsProps = {
  page: number;
  pageCount: number;
  totalCount: number;
  pageSize: number;
  // 検索条件を適用しない場合の母数(例:「検索結果 8件 / 全24件」の「全24件」)
  baselineTotalCount: number;
};

// 表示するページ番号のリスト(現在±1と先頭・末尾。飛びは"…"で表す)。
function pageNumbers(page: number, pageCount: number): (number | "...")[] {
  const shown = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...shown]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);
  const result: (number | "...")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev !== 0 && n - prev > 1) result.push("...");
    result.push(n);
    prev = n;
  }
  return result;
}

// resume-list/account-list共通のページネーション+表示件数セレクト(一覧の右上に配置)。
// page/pageSizeのみをsearchParamsに反映し、検索条件はそのまま保持する。
export function PaginationControls({
  page,
  pageCount,
  totalCount,
  pageSize,
  baselineTotalCount,
}: PaginationControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function pushWith(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function goToPage(next: number) {
    pushWith((params) => {
      if (next <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(next));
      }
    });
  }

  function changePageSize(next: string) {
    pushWith((params) => {
      params.set("pageSize", next);
      params.delete("page"); // 件数変更時は1ページ目へ戻す
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm">
      <span className="font-medium text-brand">
        検索結果 <span className="text-base font-semibold">{totalCount}</span>
        件 / 全{baselineTotalCount}件
      </span>

      {pageCount > 1 ? (
        <nav aria-label="ページ送り" className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="rounded-full border border-surface-border px-3 py-1 disabled:opacity-40 hover:bg-primary/10"
          >
            前へ
          </button>
          {pageNumbers(page, pageCount).map((n, i) =>
            n === "..." ? (
              <span key={`ellipsis-${i}`} className="px-1 text-foreground/40">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => goToPage(n)}
                aria-current={n === page ? "page" : undefined}
                className={
                  n === page
                    ? "rounded-full border border-primary bg-primary px-3 py-1 text-primary-foreground"
                    : "rounded-full border border-surface-border px-3 py-1 hover:bg-primary/10"
                }
              >
                {n}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= pageCount}
            className="rounded-full border border-surface-border px-3 py-1 disabled:opacity-40 hover:bg-primary/10"
          >
            次へ
          </button>
        </nav>
      ) : null}

      <label className="flex items-center gap-1">
        <span className="text-foreground/60">表示件数</span>
        <select
          value={String(pageSize)}
          onChange={(e) => changePageSize(e.target.value)}
          className="rounded-full border border-surface-border px-3 py-1"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}件
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
