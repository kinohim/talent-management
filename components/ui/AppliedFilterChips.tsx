"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { AppliedFilterChip } from "@/lib/applied-filter-chips";

export type { AppliedFilterChip };

type AppliedFilterChipsProps = {
  chips: AppliedFilterChip[];
  // 「すべてクリア」で削除する対象キー一覧(検索条件のみ。列フィルタ・ソート・
  // pageSizeは維持する)
  clearKeys: string[];
};

// resume-list/account-list共通: 適用中の検索条件をチップ表示し、個別✕解除・
// 一括クリアをURLのsearchParams操作で行う(検索フォーム本体とは独立の表示)。
export function AppliedFilterChips({ chips, clearKeys }: AppliedFilterChipsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (chips.length === 0) return null;

  function pushWith(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function removeChip(chip: AppliedFilterChip) {
    pushWith((params) => {
      for (const { key, value } of chip.remove) {
        if (value === undefined) {
          params.delete(key);
          continue;
        }
        const remaining = params.getAll(key).filter((v) => v !== value);
        params.delete(key);
        for (const v of remaining) params.append(key, v);
      }
    });
  }

  function clearAll() {
    pushWith((params) => {
      for (const key of clearKeys) params.delete(key);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-brand/70">適用中の条件:</span>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 py-1 pl-3 pr-2 text-xs text-brand"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => removeChip(chip)}
            aria-label={`${chip.label}を解除`}
            className="rounded-full text-brand/60 hover:text-red-600"
          >
            ×
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="rounded-full border border-surface-border px-3 py-1 text-xs text-foreground/60 hover:bg-primary/10"
      >
        すべてクリア
      </button>
    </div>
  );
}
