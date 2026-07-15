"use client";

import Link from "next/link";

import {
  acquisitionsIn,
  aggregateTrend,
  formatMonthDay,
  type DashboardCategory,
  type DashboardEmployee,
  type DashboardFilter,
  type DashboardItem,
} from "@/lib/skill-map";

import { categoryColor } from "./palette";

type TrendPanelProps = {
  certifications: DashboardItem[];
  employees: DashboardEmployee[];
  categories: DashboardCategory[]; // 全カテゴリ(色の割当てはこの並び順)
  filter: DashboardFilter;
  currentFiscalYear: number;
  axisMax: number; // 全社・全カテゴリ基準の固定上限(フィルタで変えない)
  selectedKey: string | null; // クリック(フォーカス)中の年度バケツ
  onSelect: (key: string | null) => void;
};

const CHART_HEIGHT = 150;

// 年度推移(資格タブのみ)。縦軸は固定スケール+目盛り線。棒クリックで
// その年度の取得一覧を表示する(モックのrenderTrend()相当)
export function TrendPanel({
  certifications,
  employees,
  categories,
  filter,
  currentFiscalYear,
  axisMax,
  selectedKey,
  onSelect,
}: TrendPanelProps) {
  const columns = aggregateTrend(certifications, employees, filter, currentFiscalYear);
  const selectedCategories = categories.filter((c) => filter.categoryIds.has(c.id));
  const single = selectedCategories.length === 1;

  const gridValues: number[] = [];
  for (let v = 0; v <= axisMax; v += 5) gridValues.push(v);

  const detail = selectedKey
    ? acquisitionsIn(certifications, employees, filter, selectedKey, currentFiscalYear)
    : null;
  const showDept = filter.bucketId == null;

  return (
    <div>
      <div className="relative ml-9 mr-2 mt-5" style={{ height: CHART_HEIGHT }}>
        {gridValues.map((v) => (
          <div
            key={v}
            className="absolute left-0 right-0 border-t border-dashed border-[#e6e8f0]"
            style={{ bottom: `${(v / axisMax) * 100}%` }}
          >
            <span className="absolute -left-8 -top-2 w-6 text-right text-[10px] text-zinc-500">
              {v}
            </span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-4">
          {columns.map((column) => {
            const height = Math.round((column.total / axisMax) * CHART_HEIGHT);
            const selected = column.key === selectedKey;
            return (
              <button
                key={column.key}
                type="button"
                title="クリックで取得者を表示"
                onClick={() => onSelect(selected ? null : column.key)}
                className={`flex h-full flex-1 flex-col items-center justify-end rounded-lg ${
                  selected ? "bg-[#eef1fd]" : "hover:bg-[#eef1fd]"
                }`}
              >
                <span className="mb-1 text-xs font-bold">{column.total}</span>
                {/* shrink-0: 件数ラベルの分だけ棒が縮んで目盛り線とずれるのを防ぐ */}
                <span
                  className={`flex w-10 shrink-0 flex-col-reverse overflow-hidden rounded-t-md ${
                    column.isCurrent ? "outline outline-2 outline-offset-2 outline-[#3357d6]" : ""
                  }`}
                  style={{ height: Math.max(height, column.total > 0 ? 4 : 0) }}
                >
                  {single ? (
                    <span
                      className="block w-full"
                      style={{
                        height: "100%",
                        background: categoryColor(
                          categories.findIndex((c) => c.id === selectedCategories[0].id),
                        ),
                      }}
                    />
                  ) : (
                    selectedCategories.map((category) => {
                      const count = column.byCategory.get(category.id) ?? 0;
                      if (column.total === 0) return null;
                      return (
                        <span
                          key={category.id}
                          className="block w-full"
                          style={{
                            height: `${(count / column.total) * 100}%`,
                            background: categoryColor(
                              categories.findIndex((c) => c.id === category.id),
                            ),
                          }}
                        />
                      );
                    })
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="ml-9 mr-2 mt-2.5 flex gap-4">
        {columns.map((column) => (
          <div
            key={column.key}
            className={`flex-1 whitespace-nowrap text-center text-[11px] ${
              column.isCurrent ? "font-bold text-[#3357d6]" : "text-zinc-500"
            }`}
          >
            {column.key}年度{column.isCurrent ? "（今年度）" : ""}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-zinc-500">
        {selectedCategories.map((category) => (
          <span key={category.id} className="inline-flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-[3px]"
              style={{
                background: categoryColor(categories.findIndex((c) => c.id === category.id)),
              }}
            />
            {category.name}
          </span>
        ))}
        <span className="ml-auto">
          年度＝3月〜翌2月。年度別の新規取得件数（縦軸は固定）
        </span>
      </div>

      {detail ? (
        <div className="mt-4 rounded-xl border border-[#e6e8f0] bg-[#f6f7fb] px-4 py-3.5 text-xs">
          <h3 className="mb-2 font-bold">
            {selectedKey}年度の取得（{detail.length}件）
          </h3>
          {detail.length === 0 ? (
            <span className="text-zinc-500">該当する取得はありません</span>
          ) : (
            detail.map((a, i) => {
              const body = (
                <>
                  <span className="text-[11px] font-medium text-zinc-500">
                    {formatMonthDay(a.date)}
                  </span>
                  {a.name}
                  {showDept && a.deptLabel ? `（${a.deptLabel}）` : ""}
                  <span className="font-semibold text-[#3357d6]">{a.certificationName}</span>
                </>
              );
              const chipClass =
                "mb-1 mr-2 inline-flex items-center gap-1.5 rounded-full border border-[#e6e8f0] bg-white px-3 py-0.5 font-semibold";
              return a.canView ? (
                <Link
                  key={i}
                  href={`/resumes/${a.employeeId}`}
                  className={`${chipClass} hover:underline`}
                >
                  {body}
                </Link>
              ) : (
                <span key={i} className={chipClass}>
                  {body}
                </span>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
