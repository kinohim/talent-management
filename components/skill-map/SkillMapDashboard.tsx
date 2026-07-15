"use client";

import { useMemo, useState } from "react";

import {
  recommendCertifications,
  type SkillMapDashboardData,
} from "@/lib/skill-map";

import { AcquisitionTicker } from "./AcquisitionTicker";
import { CompositionPanel } from "./CompositionPanel";
import { CategoryChips, DeptTabs, FilterRow, Segmented } from "./DashboardFilters";
import { HeatmapPanel } from "./HeatmapPanel";
import { TrendPanel } from "./TrendPanel";

type Section = "cert" | "skill" | "heat";
type CertView = "ratio" | "trend";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "cert", label: "資格" },
  { key: "skill", label: "スキル" },
  { key: "heat", label: "ヒートマップ" },
];

// REF008 スキルマップ/組織ダッシュボード本体。全社分のDTOを受け取り、
// 部署・カテゴリ等の絞り込みはすべてクライアント側で行う
// (docs/dashboard-design.md)。タブ切替で各パネルの状態(フィルタ・展開・
// 並び順)を保持するため、非表示パネルはアンマウントせずhiddenにする。
export function SkillMapDashboard({ data }: { data: SkillMapDashboardData }) {
  const [section, setSection] = useState<Section>("cert");

  const allCertCategoryIds = useMemo(
    () => new Set(data.certCategories.map((c) => c.id)),
    [data.certCategories],
  );
  const allSkillCategoryIds = useMemo(
    () => new Set(data.skillCategories.map((c) => c.id)),
    [data.skillCategories],
  );

  // 資格タブ
  const [certBucketId, setCertBucketId] = useState<number | null>(null);
  const [certCategoryIds, setCertCategoryIds] =
    useState<ReadonlySet<number>>(allCertCategoryIds);
  const [certView, setCertView] = useState<CertView>("ratio");
  const [trendKey, setTrendKey] = useState<string | null>(null);

  // スキルタブ
  const [skillBucketId, setSkillBucketId] = useState<number | null>(null);
  const [skillCategoryIds, setSkillCategoryIds] =
    useState<ReadonlySet<number>>(allSkillCategoryIds);

  // ヒートマップタブ
  const [heatType, setHeatType] = useState<"cert" | "skill">("cert");
  const [heatMode, setHeatMode] = useState<"count" | "rate">("count");
  const [heatCertCategoryIds, setHeatCertCategoryIds] =
    useState<ReadonlySet<number>>(allCertCategoryIds);
  const [heatSkillCategoryIds, setHeatSkillCategoryIds] =
    useState<ReadonlySet<number>>(allSkillCategoryIds);

  const myCertificationIds = useMemo(
    () => new Set(data.myCertificationIds),
    [data.myCertificationIds],
  );

  const certFilter = { bucketId: certBucketId, categoryIds: certCategoryIds };
  const scopeName =
    certBucketId == null
      ? "全社"
      : (data.buckets.find((b) => b.id === certBucketId)?.name ?? "全社");
  const recommendations = recommendCertifications(data.certifications, data.employees, {
    bucketId: certBucketId,
    scopeName,
    myCertificationIds,
  });

  const panelClass = "rounded-2xl border border-[#e6e8f0] bg-white px-6 py-5";

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">スキルマップ/組織ダッシュボード</h1>
        <div className="rounded-xl border border-[#e6e8f0] bg-white px-4 py-2 text-[13px] text-zinc-500">
          資格保有 <b className="mx-0.5 text-xl text-zinc-900">{data.kpiTotal}</b>件
          <span className="ml-2 text-xs font-bold text-[#1a9e5c]">
            ▲ +{data.tickerItems.length}件（前年度末比）
          </span>
        </div>
      </div>

      <AcquisitionTicker items={data.tickerItems} />

      <div className="flex gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSection(s.key)}
            className={`flex-1 rounded-xl border px-3 py-3 text-sm font-bold ${
              section === s.key
                ? "border-[#3357d6] bg-[#3357d6] text-white"
                : "border-[#e6e8f0] bg-white text-zinc-500 hover:bg-[#eef1fd]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 資格 */}
      <section className={section === "cert" ? panelClass : "hidden"}>
        <div className="flex flex-col gap-3">
          <FilterRow label="部署">
            <DeptTabs buckets={data.buckets} value={certBucketId} onChange={setCertBucketId} />
          </FilterRow>
          <FilterRow label="カテゴリ">
            <CategoryChips
              categories={data.certCategories}
              selected={certCategoryIds}
              onChange={setCertCategoryIds}
            />
          </FilterRow>
          <FilterRow label="表示" scrollable={false}>
            <Segmented
              options={[
                { value: "ratio", label: "構成比" },
                { value: "trend", label: "年度推移" },
              ]}
              value={certView}
              onChange={setCertView}
            />
          </FilterRow>
        </div>
        {certView === "ratio" ? (
          <CompositionPanel
            items={data.certifications}
            employees={data.employees}
            filter={certFilter}
            recommendations={recommendations}
          />
        ) : (
          <TrendPanel
            certifications={data.certifications}
            employees={data.employees}
            categories={data.certCategories}
            filter={certFilter}
            currentFiscalYear={data.currentFiscalYear}
            axisMax={data.trendAxisMax}
            selectedKey={trendKey}
            onSelect={setTrendKey}
          />
        )}
        <p className="mt-4 text-[11px] text-zinc-500">
          {certView === "ratio"
            ? "💡＝あなたへのおすすめ／凡例クリックで保有者を表示"
            : "棒グラフをクリックすると、その年度の取得者を表示します"}
        </p>
      </section>

      {/* スキル */}
      <section className={section === "skill" ? panelClass : "hidden"}>
        <div className="flex flex-col gap-3">
          <FilterRow label="部署">
            <DeptTabs
              buckets={data.buckets}
              value={skillBucketId}
              onChange={setSkillBucketId}
            />
          </FilterRow>
          <FilterRow label="カテゴリ">
            <CategoryChips
              categories={data.skillCategories}
              selected={skillCategoryIds}
              onChange={setSkillCategoryIds}
            />
          </FilterRow>
        </div>
        <CompositionPanel
          items={data.skills}
          employees={data.employees}
          filter={{ bucketId: skillBucketId, categoryIds: skillCategoryIds }}
        />
        <p className="mt-4 text-[11px] text-zinc-500">凡例クリックで保有者を表示</p>
      </section>

      {/* ヒートマップ */}
      <section className={section === "heat" ? panelClass : "hidden"}>
        <div className="flex flex-col gap-3">
          <FilterRow label="対象" scrollable={false}>
            <Segmented
              options={[
                { value: "cert", label: "資格" },
                { value: "skill", label: "スキル" },
              ]}
              value={heatType}
              onChange={setHeatType}
            />
            <span className="text-xs font-semibold text-zinc-500">集計</span>
            <Segmented
              options={[
                { value: "count", label: "人数" },
                { value: "rate", label: "保有率" },
              ]}
              value={heatMode}
              onChange={setHeatMode}
            />
          </FilterRow>
          <FilterRow label="カテゴリ">
            {heatType === "cert" ? (
              <CategoryChips
                categories={data.certCategories}
                selected={heatCertCategoryIds}
                onChange={setHeatCertCategoryIds}
              />
            ) : (
              <CategoryChips
                categories={data.skillCategories}
                selected={heatSkillCategoryIds}
                onChange={setHeatSkillCategoryIds}
              />
            )}
          </FilterRow>
        </div>
        <HeatmapPanel
          items={heatType === "cert" ? data.certifications : data.skills}
          employees={data.employees}
          buckets={data.buckets}
          categories={heatType === "cert" ? data.certCategories : data.skillCategories}
          selectedCategoryIds={heatType === "cert" ? heatCertCategoryIds : heatSkillCategoryIds}
          mode={heatMode}
          viewerDivisionId={data.viewerDivisionId}
        />
      </section>
    </main>
  );
}
