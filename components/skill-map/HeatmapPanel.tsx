"use client";

import { useRef, useState } from "react";

import {
  buildHeatmapRows,
  defaultHeatmapVisibleIds,
  type DashboardCategory,
  type DashboardEmployee,
  type DashboardItem,
  type DepartmentBucket,
  type HeatmapMode,
} from "@/lib/skill-map";

import { HEAT_LEVELS } from "./palette";

type HeatmapPanelProps = {
  items: DashboardItem[];
  employees: DashboardEmployee[];
  buckets: DepartmentBucket[];
  categories: DashboardCategory[];
  selectedCategoryIds: ReadonlySet<number>;
  mode: HeatmapMode;
  // ログインユーザーの所属事業部(初期表示行=自事業部+配下の部。未所属は全行)
  viewerDivisionId: number | null;
};

// ヒートマップ本体。行=部署(事業部・部)、列=カテゴリ。
// 初期表示行はログインユーザーの所属事業部配下。各行の×で非表示にでき、
// 非表示の部署はテーブル下部にタグとして横並びになり、タグ押下で再表示する
// (最低1行は表示)。行ヘッダのドラッグ(クリックしたまま上下に移動)で
// 並び替えができる。並び順・表示状態は画面内の状態のみで永続化しない。
export function HeatmapPanel({
  items,
  employees,
  buckets,
  categories,
  selectedCategoryIds,
  mode,
  viewerDivisionId,
}: HeatmapPanelProps) {
  const [rowOrder, setRowOrder] = useState<number[]>(() => buckets.map((b) => b.id));
  const [visibleIds, setVisibleIds] = useState<ReadonlySet<number>>(() =>
    defaultHeatmapVisibleIds(buckets, viewerDivisionId),
  );
  const draggingId = useRef<number | null>(null);

  const bucketById = new Map(buckets.map((b) => [b.id, b]));
  const orderedBuckets = rowOrder
    .map((id) => bucketById.get(id))
    .filter((b): b is DepartmentBucket => b != null);
  const visibleBuckets = orderedBuckets.filter((b) => visibleIds.has(b.id));

  const selectedCategories = categories.filter((c) => selectedCategoryIds.has(c.id));
  const rows = buildHeatmapRows(
    items,
    employees,
    visibleBuckets,
    selectedCategories.map((c) => c.id),
    mode,
  );

  function hideRow(id: number) {
    setVisibleIds((prev) => {
      if (prev.size === 1) return prev; // 最低1行は表示
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function showRow(id: number) {
    setVisibleIds((prev) => new Set(prev).add(id));
  }

  // ドラッグ中、ポインタ直下の行と位置を入れ替える
  function moveDraggedRowTo(targetId: number) {
    const sourceId = draggingId.current;
    if (sourceId == null || sourceId === targetId) return;
    setRowOrder((prev) => {
      const next = prev.filter((id) => id !== sourceId);
      next.splice(next.indexOf(targetId), 0, sourceId);
      return next;
    });
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (draggingId.current == null) return;
    const hovered = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>("[data-bucket-id]");
    if (hovered?.dataset.bucketId) {
      moveDraggedRowTo(Number(hovered.dataset.bucketId));
    }
  }

  return (
    <div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="w-0 whitespace-nowrap py-2 pl-1.5 pr-8 text-left" />
              {selectedCategories.map((category) => (
                <th
                  key={category.id}
                  className="whitespace-nowrap px-1.5 py-2 text-center text-[11px] font-semibold text-zinc-500"
                >
                  {category.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleBuckets.map((bucket, rowIndex) => (
              <tr key={bucket.id} data-bucket-id={bucket.id}>
                <th
                  onPointerDown={(e) => {
                    draggingId.current = bucket.id;
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={handlePointerMove}
                  onPointerUp={() => {
                    draggingId.current = null;
                  }}
                  title="ドラッグで行を並び替え"
                  className="w-0 cursor-grab touch-none select-none whitespace-nowrap py-2 pl-1.5 pr-8 text-left font-semibold active:cursor-grabbing"
                >
                  <span className="mr-1.5 text-zinc-400" aria-hidden>
                    ⠿
                  </span>
                  {bucket.name}
                  <span className="font-medium text-zinc-500">（{bucket.headCount}名）</span>
                  {visibleBuckets.length > 1 ? (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => hideRow(bucket.id)}
                      aria-label={`${bucket.name}の行を非表示`}
                      title="この行を非表示"
                      className="ml-1.5 cursor-pointer rounded-full px-1 text-zinc-400 hover:text-zinc-700"
                    >
                      ×
                    </button>
                  ) : null}
                </th>
                {rows[rowIndex].cells.map((cell, i) => (
                  <td
                    key={selectedCategories[i].id}
                    className="min-w-16 rounded-lg px-2.5 py-3 text-center font-bold"
                    style={HEAT_LEVELS[cell.level]}
                  >
                    {mode === "count" ? cell.value : `${cell.value}%`}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orderedBuckets.some((b) => !visibleIds.has(b.id)) ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-zinc-500">非表示:</span>
          {orderedBuckets
            .filter((b) => !visibleIds.has(b.id))
            .map((bucket) => (
              <button
                key={bucket.id}
                type="button"
                onClick={() => showRow(bucket.id)}
                title="押下で再表示"
                className="shrink-0 whitespace-nowrap rounded-full border border-[#e6e8f0] bg-white px-3 py-1 text-xs font-semibold text-zinc-500 hover:bg-[#eef1fd]"
              >
                + {bucket.name}
              </button>
            ))}
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-500">
        少ない
        {HEAT_LEVELS.map((level, i) => (
          <i
            key={i}
            className="inline-block h-3 w-5 rounded-[3px]"
            style={{ background: level.background }}
          />
        ))}
        多い
      </div>
      <p className="mt-3 text-[11px] text-zinc-500">
        人数は延べ人数（1人が複数保有する場合は重複してカウント）。そのため保有率（＝延べ人数÷部署在籍人数）は100%を超える場合があります。色が濃い＝多い。行ヘッダのドラッグで並び替え、行の×で非表示にできます(非表示の部署は下のタグ押下で再表示)。
      </p>
    </div>
  );
}
