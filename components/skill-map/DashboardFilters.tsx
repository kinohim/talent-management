"use client";

import type { DashboardCategory, DepartmentBucket } from "@/lib/skill-map";

// skill-mapの共通フィルタ部品(部署タブ・カテゴリチップ・セグメント切替)。
// タブ・チップが表示幅に収まらない場合は折り返さず横スクロールする
// (docs/dashboard-design.md「共通フィルタ」)。

type FilterRowProps = {
  label: string;
  children: React.ReactNode;
  scrollable?: boolean;
};

export function FilterRow({ label, children, scrollable = true }: FilterRowProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-xs font-semibold text-zinc-500">{label}</span>
      {scrollable ? (
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {children}
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{children}</div>
      )}
    </div>
  );
}

type DeptTabsProps = {
  buckets: DepartmentBucket[];
  value: number | null; // nullは「全社」
  onChange: (bucketId: number | null) => void;
};

export function DeptTabs({ buckets, value, onChange }: DeptTabsProps) {
  const options: { key: string; id: number | null; label: string }[] = [
    { key: "all", id: null, label: "全社" },
    ...buckets.map((b) => ({ key: `b-${b.id}`, id: b.id, label: b.name })),
  ];
  return (
    <>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.id)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold ${
              active
                ? "border-[#3357d6] bg-[#3357d6] text-white"
                : "border-[#e6e8f0] bg-white text-zinc-500 hover:bg-[#eef1fd]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </>
  );
}

type CategoryChipsProps = {
  categories: DashboardCategory[];
  selected: ReadonlySet<number>;
  onChange: (next: Set<number>) => void;
};

// 複数選択・デフォルト全ON。最後の1つはOFF不可(クリック無効)
export function CategoryChips({ categories, selected, onChange }: CategoryChipsProps) {
  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) {
      if (next.size === 1) return;
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  }

  return (
    <>
      {categories.map((category) => {
        const on = selected.has(category.id);
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => toggle(category.id)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold ${
              on
                ? "border-[#3357d6] bg-[#eef1fd] text-[#3357d6]"
                : "border-[#e6e8f0] bg-white text-zinc-500"
            }`}
          >
            {on ? "✓ " : ""}
            {category.name}
          </button>
        );
      })}
    </>
  );
}

type SegmentedProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-[#e6e8f0]">
      {options.map((option, i) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`px-4 py-1.5 text-xs font-semibold ${
            i > 0 ? "border-l border-[#e6e8f0]" : ""
          } ${
            option.value === value
              ? "bg-[#3357d6] text-white"
              : "bg-white text-zinc-500 hover:bg-[#eef1fd]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
