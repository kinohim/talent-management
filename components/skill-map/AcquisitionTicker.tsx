"use client";

import { useState } from "react";

import { formatMonthDay, type FiscalYearAcquisition } from "@/lib/skill-map";

type AcquisitionTickerProps = {
  items: FiscalYearAcquisition[]; // 今年度の取得(新しい順)
};

// 🎉ティッカー: 今年度に取得された資格を右から左へ途切れずに流す
// (マーキー表示)。ホバーで一時停止。直近3か月以内の取得にはNEWバッジ。
export function AcquisitionTicker({ items }: AcquisitionTickerProps) {
  const [paused, setPaused] = useState(false);

  // 1件あたり6秒を目安に、件数に応じて周回時間を伸ばす
  const durationSeconds = Math.max(18, items.length * 6);

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-[#e6e8f0] bg-white px-4 py-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="shrink-0 text-lg" aria-hidden>
        🎉
      </span>
      {items.length === 0 ? (
        <p className="text-[13px] text-zinc-500">今年度の取得はまだありません</p>
      ) : (
        <>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div
              className="flex w-max"
              style={{
                animation: `skill-map-marquee ${durationSeconds}s linear infinite`,
                animationPlayState: paused ? "paused" : "running",
              }}
            >
              {/* シームレスなループのため同じ並びを2周分描画する */}
              {[0, 1].map((lap) => (
                <div key={lap} className="flex" aria-hidden={lap === 1}>
                  {items.map((item, i) => (
                    <span
                      key={`${lap}-${i}`}
                      className="mr-12 whitespace-nowrap text-[13px]"
                    >
                      <span className="mr-2 text-xs text-zinc-500">
                        {formatMonthDay(item.date)}
                      </span>
                      <b className="text-[#3357d6]">{item.name}</b>
                      さん{item.deptLabel ? `（${item.deptLabel}）` : ""}が{" "}
                      <b className="text-[#3357d6]">{item.certificationName}</b>{" "}
                      を取得しました！
                      {item.isNew ? (
                        <span className="ml-2 rounded-md bg-[#e6f6ee] px-2 py-0.5 align-middle text-[10px] font-bold text-[#1a9e5c]">
                          NEW
                        </span>
                      ) : null}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <span className="shrink-0 whitespace-nowrap text-[11px] text-zinc-500">
            全{items.length}件（今年度）
          </span>
        </>
      )}
    </div>
  );
}
