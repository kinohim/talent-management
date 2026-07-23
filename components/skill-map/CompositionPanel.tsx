"use client";

import Link from "next/link";
import { useState } from "react";

import {
  collectComposition,
  type CompositionHolder,
  type DashboardEmployee,
  type DashboardFilter,
  type DashboardItem,
} from "@/lib/skill-map";

import { DONUT_PALETTE, REST_COLOR } from "./palette";

type CompositionPanelProps = {
  items: DashboardItem[];
  employees: DashboardEmployee[];
  filter: DashboardFilter;
  // 資格タブのみ: 項目id→💡ツールチップ文言
  recommendations?: ReadonlyMap<number, string>;
};

// ドーナツの塗り(conic-gradient)を組み立てる(モックのconic()と同一)
function conicGradient(parts: { color: string; pct: number }[]): string {
  let acc = 0;
  const segments = parts.map((part, i) => {
    const start = acc;
    acc = i === parts.length - 1 ? 100 : acc + part.pct;
    return `${part.color} ${start}% ${acc}%`;
  });
  return `conic-gradient(${segments.join(",")})`;
}

function HolderChips({
  holders,
  showDept,
}: {
  holders: CompositionHolder[];
  showDept: boolean;
}) {
  return (
    <div className="pb-3 pl-6">
      {holders.map((holder) => {
        const label = `${holder.name}${showDept && holder.deptLabel ? `（${holder.deptLabel}）` : ""}`;
        const chipClass =
          "mr-1 mt-1 inline-block rounded-full bg-[#eef1fd] px-3 py-0.5 text-xs font-semibold text-[#3357d6]";
        return holder.canView ? (
          <Link
            key={holder.employeeId}
            href={`/resumes/${holder.employeeId}`}
            className={`${chipClass} hover:underline`}
          >
            {label}
          </Link>
        ) : (
          <span key={holder.employeeId} className={chipClass}>
            {label}
          </span>
        );
      })}
    </div>
  );
}

// 構成比(ドーナツ+凡例)。上位5+「その他」に集約し、凡例クリックで保有者を
// チップ展開する(資格タブ・スキルタブ共通。モックのrenderComposition()相当)
export function CompositionPanel({
  items,
  employees,
  filter,
  recommendations,
}: CompositionPanelProps) {
  const [openIds, setOpenIds] = useState<ReadonlySet<number | "rest">>(new Set());

  const composition = collectComposition(items, employees, filter);
  const showDept = filter.bucketId == null;

  if (composition.total === 0) {
    return (
      <div className="py-8 text-center text-sm text-zinc-500">該当する登録がありません</div>
    );
  }

  const parts = composition.top.map((slice, i) => ({
    color: DONUT_PALETTE[i],
    pct: (slice.count / composition.total) * 100,
  }));
  if (composition.rest.length > 0) {
    parts.push({
      color: REST_COLOR,
      pct: (composition.restTotal / composition.total) * 100,
    });
  }

  function toggle(id: number | "rest") {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-start gap-10">
      <div
        className="relative mt-2 h-56 w-56 shrink-0 rounded-full"
        style={{ background: conicGradient(parts) }}
        role="img"
        aria-label="構成比ドーナツチャート"
      >
        <div className="absolute inset-10 rounded-full bg-white" />
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
          <b className="text-3xl">{composition.total}</b>
          <span className="text-xs text-zinc-500">件</span>
        </div>
      </div>

      <div className="min-w-[280px] max-w-lg flex-1">
        {composition.top.map((slice, i) => {
          const open = openIds.has(slice.id);
          const tooltip = recommendations?.get(slice.id);
          return (
            <div
              key={slice.id}
              className="border-b border-[#e6e8f0] last:border-b-0"
            >
              <button
                type="button"
                onClick={() => toggle(slice.id)}
                className="grid w-full grid-cols-[14px_1fr_60px_16px] items-center gap-2.5 rounded-lg px-1 py-2 text-left text-sm hover:bg-[#eef1fd]"
                aria-expanded={open}
              >
                <span
                  className="h-3 w-3 rounded-[3px]"
                  style={{ background: DONUT_PALETTE[i] }}
                />
                <span>
                  {slice.name}
                  {tooltip ? (
                    <span className="group relative ml-1 cursor-help">
                      💡
                      <span className="absolute bottom-[135%] left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#1c2333] px-3 py-1.5 text-[11px] font-medium text-white group-hover:block">
                        {tooltip}
                      </span>
                    </span>
                  ) : null}
                </span>
                <span className="whitespace-nowrap text-right text-xs text-zinc-500">
                  {slice.count}名
                </span>
                <span
                  className={`text-center text-[11px] text-zinc-500 transition-transform ${open ? "rotate-90" : ""}`}
                  aria-hidden
                >
                  ▶
                </span>
              </button>
              {open ? <HolderChips holders={slice.holders} showDept={showDept} /> : null}
            </div>
          );
        })}

        {composition.rest.length > 0 ? (
          <div className="border-t border-[#e6e8f0]">
            <button
              type="button"
              onClick={() => toggle("rest")}
              className="grid w-full grid-cols-[14px_1fr_60px_16px] items-center gap-2.5 rounded-lg px-1 py-2 text-left text-sm hover:bg-[#eef1fd]"
              aria-expanded={openIds.has("rest")}
            >
              <span className="h-3 w-3 rounded-[3px]" style={{ background: REST_COLOR }} />
              <span>その他（{composition.rest.length}種）</span>
              <span className="whitespace-nowrap text-right text-xs text-zinc-500">
                {composition.restTotal}件
              </span>
              <span
                className={`text-center text-[11px] text-zinc-500 transition-transform ${openIds.has("rest") ? "rotate-90" : ""}`}
                aria-hidden
              >
                ▶
              </span>
            </button>
            {openIds.has("rest") ? (
              <div className="pb-3 pl-6">
                {composition.rest.map((row) => (
                  <span
                    key={row.id}
                    className="mr-1 mt-1 inline-block rounded-full bg-[#f3f4f8] px-3 py-0.5 text-xs font-semibold text-zinc-500"
                  >
                    {row.name}（{row.count}名）
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
