"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import {
  ConditionTagFilter,
  type ConditionMatchMode,
  type ConditionOption,
} from "@/components/resumes/ConditionTagFilter";
import { CascadingOrganizationUnitFilter } from "@/components/ui/CascadingOrganizationUnitFilter";
import { ClearableInput } from "@/components/ui/ClearableInput";
import {
  CollapsibleSearchCard,
  notifySearchExecuted,
} from "@/components/ui/CollapsibleSearchCard";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import type { OrganizationUnitNode } from "@/lib/organization-unit-tree";
import type { MatchMode } from "@/lib/resume-search";

type ResumeFilterFormProps = {
  orgTree: OrganizationUnitNode[];
  skillOptions: ConditionOption[];
  certificationOptions: ConditionOption[];
  siteOptions: ConditionOption[];
  initialName: string;
  initialOrgUnitIds: number[];
  initialExperienceMin: number | null;
  initialExperienceMax: number | null;
  initialSkillIds: number[];
  initialSkillMode: MatchMode;
  initialCertificationIds: number[];
  initialCertificationMode: MatchMode;
  initialSiteId: number | null;
  initialIncludeRetired: boolean;
};

// 携わったプロジェクト(現場)の単一選択。セレクトボックスで選ぶだけで
// 検索条件になる(確定ボタンなし。適用は検索ボタン)。
function SingleSiteSelect({
  options,
  selected,
  onChange,
}: {
  options: ConditionOption[];
  selected: ConditionOption | null;
  onChange: (site: ConditionOption | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="site-filter" className="text-sm font-medium">
        携わったプロジェクト(現場)
      </label>
      <select
        id="site-filter"
        value={selected?.id ?? ""}
        onChange={(e) => {
          const id = Number(e.target.value);
          onChange(options.find((option) => option.id === id) ?? null);
        }}
        className="max-w-64 rounded-full border border-surface-border px-3 py-1.5 text-sm"
      >
        <option value="">指定なし</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-foreground/60">
        過去〜現在に携わったプロジェクトの現場で検索します(1件のみ)。
      </p>
    </div>
  );
}

// resume-listのフィルタ。account-listのAccountFilterFormと同じく、送信は`router.push`
// によるURLのsearchParams更新で行う(Server Componentがそのままwhere条件に
// 変換する)。上段に基本条件+所属組織+現場、下段にスキル条件と資格条件を横並び。
export function ResumeFilterForm({
  orgTree,
  skillOptions,
  certificationOptions,
  siteOptions,
  initialName,
  initialOrgUnitIds,
  initialExperienceMin,
  initialExperienceMax,
  initialSkillIds,
  initialSkillMode,
  initialCertificationIds,
  initialCertificationMode,
  initialSiteId,
  initialIncludeRetired,
}: ResumeFilterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(initialName);
  const [orgUnitIds, setOrgUnitIds] = useState<number[]>(initialOrgUnitIds);
  const [experienceMin, setExperienceMin] = useState(
    initialExperienceMin != null ? String(initialExperienceMin) : "",
  );
  const [experienceMax, setExperienceMax] = useState(
    initialExperienceMax != null ? String(initialExperienceMax) : "",
  );
  const [skills, setSkills] = useState<ConditionOption[]>(
    skillOptions.filter((option) => initialSkillIds.includes(option.id)),
  );
  const [skillMode, setSkillMode] =
    useState<ConditionMatchMode>(initialSkillMode);
  const [certifications, setCertifications] = useState<ConditionOption[]>(
    certificationOptions.filter((option) =>
      initialCertificationIds.includes(option.id),
    ),
  );
  const [certificationMode, setCertificationMode] =
    useState<ConditionMatchMode>(initialCertificationMode);
  const [site, setSite] = useState<ConditionOption | null>(
    siteOptions.find((option) => option.id === initialSiteId) ?? null,
  );
  const [includeRetired, setIncludeRetired] = useState(initialIncludeRetired);
  // 検索実行(ナビゲーション)中は画面全体にローディングを表示する
  const [isSearching, startSearch] = useTransition();

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    // 検索し直しなので列フィルタ(col*)・ソート・ページは破棄し1ページ目へ。
    // 表示件数(pageSize)だけはユーザー設定として引き継ぐ。
    const params = new URLSearchParams();
    const pageSize = searchParams.get("pageSize");
    if (pageSize) params.set("pageSize", pageSize);
    if (name) params.set("name", name);
    for (const id of orgUnitIds) params.append("orgUnitId", String(id));
    if (experienceMin) params.set("experienceMin", experienceMin);
    if (experienceMax) params.set("experienceMax", experienceMax);
    for (const skill of skills) params.append("skillId", String(skill.id));
    if (skills.length > 0) params.set("skillMode", skillMode);
    for (const cert of certifications)
      params.append("certificationId", String(cert.id));
    if (certifications.length > 0)
      params.set("certificationMode", certificationMode);
    if (site) params.set("siteId", String(site.id));
    if (includeRetired) params.set("includeRetired", "true");
    notifySearchExecuted("/resumes");
    startSearch(() => {
      router.push(`/resumes?${params.toString()}`);
    });
  }

  // 全検索フィールドの一括クリア(検索は実行しない)
  function clearFilters() {
    setName("");
    setOrgUnitIds([]);
    setExperienceMin("");
    setExperienceMax("");
    setSkills([]);
    setSkillMode("OR");
    setCertifications([]);
    setCertificationMode("OR");
    setSite(null);
    setIncludeRetired(false);
  }

  // 項目順: 氏名カナ→経験年数→所属組織→スキル→資格→携わったプロジェクト→
  // 退職者を含める→検索/クリア(docs/screens.md resume-list)
  // ローディングはカードの外に置く(検索後に閉じる=ONだと検索直後にカードの
  // 中身がhiddenになり、内側に置くとオーバーレイごと消えてしまうため)
  return (
    <>
      <LoadingOverlay show={isSearching} />
      <CollapsibleSearchCard storageKey="/resumes">
        <form onSubmit={applyFilters} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">氏名カナ</label>
              <ClearableInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                placeholder="氏名・カナで検索"
                className="max-w-64 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">経験年数</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={experienceMin}
                  onChange={(e) => setExperienceMin(e.target.value)}
                  className="w-20 rounded-full border border-surface-border px-3 py-1 text-sm"
                />
                <span className="text-sm">〜</span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={experienceMax}
                  onChange={(e) => setExperienceMax(e.target.value)}
                  className="w-20 rounded-full border border-surface-border px-3 py-1 text-sm"
                />
                <span className="text-sm">年</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">所属組織</span>
              <CascadingOrganizationUnitFilter
                tree={orgTree}
                values={orgUnitIds}
                onChange={setOrgUnitIds}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
            <ConditionTagFilter
              label="スキル条件"
              options={skillOptions}
              selected={skills}
              onSelectedChange={setSkills}
              mode={skillMode}
              onModeChange={setSkillMode}
            />

            <ConditionTagFilter
              label="取得資格条件"
              options={certificationOptions}
              selected={certifications}
              onSelectedChange={setCertifications}
              mode={certificationMode}
              onModeChange={setCertificationMode}
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-x-8 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
            <SingleSiteSelect
              options={siteOptions}
              selected={site}
              onChange={setSite}
            />

            <label className="flex items-center gap-2 self-center text-sm">
              <input
                type="checkbox"
                checked={includeRetired}
                onChange={(e) => setIncludeRetired(e.target.checked)}
                className="accent-primary"
              />
              退職者を含める
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary-dark"
            >
              検索
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full border border-primary px-4 py-2 text-sm text-brand hover:bg-primary/10"
            >
              クリア
            </button>
          </div>
        </form>
      </CollapsibleSearchCard>
    </>
  );
}
