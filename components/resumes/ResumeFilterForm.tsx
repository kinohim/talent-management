"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  ConditionTagFilter,
  type ConditionMatchMode,
  type ConditionOption,
} from "@/components/resumes/ConditionTagFilter";
import { CascadingOrganizationUnitFilter } from "@/components/ui/CascadingOrganizationUnitFilter";
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

// 携わったプロジェクト(現場)の単一選択コンボボックス。
// datalistのサジェストから現場名で選び、確定した1件のみを保持する。
function SingleSiteSelect({
  options,
  selected,
  onChange,
}: {
  options: ConditionOption[];
  selected: ConditionOption | null;
  onChange: (site: ConditionOption | null) => void;
}) {
  const [inputValue, setInputValue] = useState("");

  function confirmFromInput() {
    const trimmed = inputValue.trim();
    const matched = options.find((option) => option.name === trimmed);
    if (matched) {
      onChange(matched);
      setInputValue("");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">携わったプロジェクト(現場)</span>
      {selected ? (
        <span className="flex w-fit items-center gap-1 rounded-full border px-3 py-1 text-xs">
          {selected.name}
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-zinc-500 hover:text-red-600"
            aria-label={`${selected.name}を解除`}
          >
            ×
          </button>
        </span>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            list="site-single-options"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmFromInput();
              }
            }}
            placeholder="現場を選択"
            className="w-full max-w-56 rounded border px-2 py-1 text-sm"
          />
          <datalist id="site-single-options">
            {options.map((option) => (
              <option key={option.id} value={option.name} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={confirmFromInput}
            className="rounded border px-3 py-1 text-xs"
          >
            選択
          </button>
        </div>
      )}
      <p className="text-xs text-zinc-500">
        過去〜現在に携わったプロジェクトの現場で検索します(1件のみ)。
      </p>
    </div>
  );
}

// REF002のフィルタ。REF007のAccountFilterFormと同じく、送信は`router.push`
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
  const [skillMode, setSkillMode] = useState<ConditionMatchMode>(initialSkillMode);
  const [certifications, setCertifications] = useState<ConditionOption[]>(
    certificationOptions.filter((option) => initialCertificationIds.includes(option.id)),
  );
  const [certificationMode, setCertificationMode] =
    useState<ConditionMatchMode>(initialCertificationMode);
  const [site, setSite] = useState<ConditionOption | null>(
    siteOptions.find((option) => option.id === initialSiteId) ?? null,
  );
  const [includeRetired, setIncludeRetired] = useState(initialIncludeRetired);

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
    for (const cert of certifications) params.append("certificationId", String(cert.id));
    if (certifications.length > 0) params.set("certificationMode", certificationMode);
    if (site) params.set("siteId", String(site.id));
    if (includeRetired) params.set("includeRetired", "true");
    router.push(`/resumes?${params.toString()}`);
  }

  return (
    <form onSubmit={applyFilters} className="flex flex-col gap-6 rounded border p-4">
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">氏名・カナ</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="氏名・カナで検索"
              className="w-64 rounded border px-3 py-2 text-sm"
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
                className="w-20 rounded border px-2 py-1 text-sm"
              />
              <span className="text-sm">〜</span>
              <input
                type="number"
                min={0}
                max={99}
                value={experienceMax}
                onChange={(e) => setExperienceMax(e.target.value)}
                className="w-20 rounded border px-2 py-1 text-sm"
              />
              <span className="text-sm">年</span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeRetired}
              onChange={(e) => setIncludeRetired(e.target.checked)}
            />
            退職者を含める
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">所属組織</span>
          <CascadingOrganizationUnitFilter
            tree={orgTree}
            values={orgUnitIds}
            onChange={setOrgUnitIds}
          />
        </div>

        <SingleSiteSelect options={siteOptions} selected={site} onChange={setSite} />
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

      <button
        type="submit"
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        検索
      </button>
    </form>
  );
}
