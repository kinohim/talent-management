"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ClearableInput } from "@/components/ui/ClearableInput";

export type ColumnFilterSpec =
  | { type: "text"; paramKey: string }
  | { type: "enum"; paramKey: string; options: { value: string; label: string }[] }
  | { type: "numberRange"; minParamKey: string; maxParamKey: string }
  // 検索フォームの条件と同仕様のタグ選択(マスタ複数選択+サジェスト+AND/OR)
  | {
      type: "tagCondition";
      paramKey: string;
      modeParamKey: string;
      options: { value: string; label: string }[];
    };

type DataTableHeaderCellProps = {
  label: string;
  // 未指定の列はソート不可(resume-listの「主なスキル」等)
  sortKey?: string;
  filter?: ColumnFilterSpec;
  align?: "left" | "right";
};

const POPOVER_WIDTH = 288; // w-72

// resume-list/account-listの一覧テーブル用ヘッダセル。ラベルクリックで昇順→降順→解除の
// ソートトグル、フィルタアイコンでExcelオートフィルタ風のポップオーバーを開く。
// ソート・フィルタの状態はすべてURLのsearchParamsに載せ、DB絞込はサーバー側で行う。
// ポップオーバーはテーブルラッパの overflow にクリップされないよう
// position: fixed で描画する(開いた時点のボタン位置から算出)。
export function DataTableHeaderCell({
  label,
  sortKey,
  filter,
  align = "left",
}: DataTableHeaderCellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLTableCellElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 画面下端で見切れる場合は、描画後に実高さを測って上方向へ補正する
  // (テーブル最下部の行数が少ないケースでもポップオーバー全体が見えるように)。
  useLayoutEffect(() => {
    if (!open) return;
    const height = popoverRef.current?.offsetHeight ?? 0;
    setPopoverPosition((prev) => {
      const maxTop = window.innerHeight - height - 8;
      return prev.top > maxTop ? { ...prev, top: Math.max(8, maxTop) } : prev;
    });
  }, [open]);

  // ポップオーバー内の編集中の値(適用ボタンを押すまでURLに反映しない)
  const [textValue, setTextValue] = useState("");
  const [enumValues, setEnumValues] = useState<string[]>([]);
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [tagValues, setTagValues] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<"AND" | "OR">("OR");
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    // fixed配置のためページ側のスクロールで位置がずれる。追従はせず閉じる。
    // ただしポップオーバー内部のスクロール(所属組織リスト等)では閉じない
    function onScroll(e: Event) {
      if (e.target instanceof Node && containerRef.current?.contains(e.target)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  function pushWith(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page"); // ソート・絞込の変更時は1ページ目へ戻す
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const currentSort = searchParams.get("sort");
  const currentOrder = searchParams.get("order") === "desc" ? "desc" : "asc";
  const isSorted = sortKey !== undefined && currentSort === sortKey;

  function toggleSort() {
    if (!sortKey) return;
    pushWith((params) => {
      if (!isSorted) {
        params.set("sort", sortKey);
        params.delete("order");
      } else if (currentOrder === "asc") {
        params.set("sort", sortKey);
        params.set("order", "desc");
      } else {
        params.delete("sort");
        params.delete("order");
      }
    });
  }

  const filterActive = (() => {
    if (!filter) return false;
    if (filter.type === "numberRange") {
      return (
        searchParams.has(filter.minParamKey) || searchParams.has(filter.maxParamKey)
      );
    }
    return searchParams.has(filter.paramKey);
  })();

  function openPopover() {
    if (!filter) return;
    // 開くたびにURLの現在値をポップオーバーへ読み込む
    if (filter.type === "text") {
      setTextValue(searchParams.get(filter.paramKey) ?? "");
    } else if (filter.type === "enum") {
      setEnumValues(searchParams.getAll(filter.paramKey));
    } else if (filter.type === "numberRange") {
      setMinValue(searchParams.get(filter.minParamKey) ?? "");
      setMaxValue(searchParams.get(filter.maxParamKey) ?? "");
    } else {
      setTagValues(searchParams.getAll(filter.paramKey));
      setTagMode(searchParams.get(filter.modeParamKey) === "AND" ? "AND" : "OR");
      setTagInput("");
    }
    // fixed配置の座標をボタン位置から算出(画面右端をはみ出す場合は左へ寄せる)
    const rect = filterButtonRef.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8);
      setPopoverPosition({ top: rect.bottom + 4, left: Math.max(8, left) });
    }
    setOpen(true);
  }

  function applyFilter() {
    if (!filter) return;
    pushWith((params) => {
      if (filter.type === "text") {
        params.delete(filter.paramKey);
        if (textValue.trim() !== "") params.set(filter.paramKey, textValue.trim());
      } else if (filter.type === "enum") {
        params.delete(filter.paramKey);
        for (const value of enumValues) params.append(filter.paramKey, value);
      } else if (filter.type === "numberRange") {
        params.delete(filter.minParamKey);
        params.delete(filter.maxParamKey);
        if (minValue !== "") params.set(filter.minParamKey, minValue);
        if (maxValue !== "") params.set(filter.maxParamKey, maxValue);
      } else {
        params.delete(filter.paramKey);
        params.delete(filter.modeParamKey);
        for (const value of tagValues) params.append(filter.paramKey, value);
        if (tagValues.length > 0) params.set(filter.modeParamKey, tagMode);
      }
    });
    setOpen(false);
  }

  function clearFilter() {
    if (!filter) return;
    pushWith((params) => {
      if (filter.type === "numberRange") {
        params.delete(filter.minParamKey);
        params.delete(filter.maxParamKey);
      } else {
        params.delete(filter.paramKey);
        if (filter.type === "tagCondition") params.delete(filter.modeParamKey);
      }
    });
    setOpen(false);
  }

  function addTagFromInput() {
    if (!filter || filter.type !== "tagCondition") return;
    const trimmed = tagInput.trim();
    const matched = filter.options.find((option) => option.label === trimmed);
    if (matched && !tagValues.includes(matched.value)) {
      setTagValues((prev) => [...prev, matched.value]);
    }
    setTagInput("");
  }

  const datalistId = `${label}-filter-options`;

  return (
    <th
      ref={containerRef}
      className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}
    >
      <span className="inline-flex items-center gap-1">
        {sortKey ? (
          <button
            type="button"
            onClick={toggleSort}
            className="inline-flex items-center gap-1 hover:underline"
            title="クリックで昇順/降順を切り替え"
          >
            {label}
            <span aria-hidden="true" className="text-xs text-foreground/40">
              {isSorted ? (currentOrder === "asc" ? "▲" : "▼") : "⇅"}
            </span>
          </button>
        ) : (
          label
        )}
        {filter ? (
          <button
            ref={filterButtonRef}
            type="button"
            onClick={() => (open ? setOpen(false) : openPopover())}
            aria-label={`${label}で絞り込む`}
            title={`${label}で絞り込む`}
            className={
              filterActive
                ? "rounded-full border border-primary bg-primary px-1.5 text-xs text-primary-foreground"
                : "rounded-full border border-surface-border px-1.5 text-xs text-foreground/50 hover:bg-primary/10"
            }
          >
            ▼
          </button>
        ) : null}
      </span>

      {open && filter ? (
        <div
          ref={popoverRef}
          style={{ top: popoverPosition.top, left: popoverPosition.left }}
          className="fixed z-30 flex w-72 flex-col gap-2 rounded-2xl border border-surface-border bg-surface p-3 text-left font-normal shadow-lg"
        >
          {filter.type === "text" ? (
            <input
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFilter();
                }
              }}
              placeholder={`${label}を含む`}
              autoFocus
              className="rounded-full border border-surface-border px-3 py-1 text-sm"
            />
          ) : null}

          {filter.type === "enum" ? (
            <div className="flex max-h-48 flex-col overflow-y-auto">
              {filter.options.map((option) => (
                <label key={option.value} className="flex items-center gap-2 py-0.5 text-sm">
                  <input
                    type="checkbox"
                    checked={enumValues.includes(option.value)}
                    onChange={() =>
                      setEnumValues((prev) =>
                        prev.includes(option.value)
                          ? prev.filter((v) => v !== option.value)
                          : [...prev, option.value],
                      )
                    }
                    className="accent-primary"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          ) : null}

          {filter.type === "numberRange" ? (
            <div className="flex items-center gap-2 text-sm">
              <input
                type="number"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                className="w-16 rounded-full border border-surface-border px-3 py-1"
                aria-label={`${label}の下限`}
              />
              <span>〜</span>
              <input
                type="number"
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
                className="w-16 rounded-full border border-surface-border px-3 py-1"
                aria-label={`${label}の上限`}
              />
            </div>
          ) : null}

          {filter.type === "tagCondition" ? (
            <>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name={`${label}-filter-mode`}
                    checked={tagMode === "OR"}
                    onChange={() => setTagMode("OR")}
                    className="accent-primary"
                  />
                  いずれか含む(OR)
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name={`${label}-filter-mode`}
                    checked={tagMode === "AND"}
                    onChange={() => setTagMode("AND")}
                    className="accent-primary"
                  />
                  すべて含む(AND)
                </label>
              </div>
              <div className="flex flex-wrap gap-1 empty:hidden">
                {tagValues.map((value) => {
                  const option = filter.options.find((o) => o.value === value);
                  return (
                    <span
                      key={value}
                      className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-brand"
                    >
                      {option?.label ?? value}
                      <button
                        type="button"
                        onClick={() =>
                          setTagValues((prev) => prev.filter((v) => v !== value))
                        }
                        className="text-brand/60 hover:text-red-600"
                        aria-label={`${option?.label ?? value}を削除`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <ClearableInput
                  list={datalistId}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTagFromInput();
                    }
                  }}
                  placeholder={`${label}を選択`}
                  autoFocus
                  className="px-3 py-1 text-sm"
                />
                <datalist id={datalistId}>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.label} />
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={addTagFromInput}
                  className="rounded-full border border-primary px-3 py-1 text-xs text-brand hover:bg-primary/10"
                >
                  追加
                </button>
              </div>
            </>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={clearFilter}
              className="rounded-full border border-surface-border px-3 py-1 text-xs hover:bg-primary/10"
            >
              クリア
            </button>
            <button
              type="button"
              onClick={applyFilter}
              className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary-dark"
            >
              適用
            </button>
          </div>
        </div>
      ) : null}
    </th>
  );
}
