"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { OrganizationUnitTreeFilter } from "@/components/accounts/OrganizationUnitTreeFilter";
import {
  ConditionTagFilter,
  type ConditionMatchMode,
  type ConditionOption,
} from "@/components/resumes/ConditionTagFilter";
import type { OrganizationUnitNode } from "@/lib/organization-unit-tree";
import type { MatchMode } from "@/lib/resume-search";

type ResumeFilterFormProps = {
  orgTree: OrganizationUnitNode[];
  skillOptions: ConditionOption[];
  certificationOptions: ConditionOption[];
  initialName: string;
  initialOrgUnitIds: number[];
  initialExperienceMin: number | null;
  initialExperienceMax: number | null;
  initialSkillIds: number[];
  initialSkillMode: MatchMode;
  initialCertificationIds: number[];
  initialCertificationMode: MatchMode;
  initialIncludeRetired: boolean;
};

// REF002のフィルタ。REF007のAccountFilterFormと同じく、送信は`router.push`
// によるURLのsearchParams更新で行う(Server Componentがそのままwhere条件に
// 変換する)。基本条件/スキル条件/資格条件は<details>で折りたたみ可能にする。
export function ResumeFilterForm({
  orgTree,
  skillOptions,
  certificationOptions,
  initialName,
  initialOrgUnitIds,
  initialExperienceMin,
  initialExperienceMax,
  initialSkillIds,
  initialSkillMode,
  initialCertificationIds,
  initialCertificationMode,
  initialIncludeRetired,
}: ResumeFilterFormProps) {
  const router = useRouter();
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
  const [includeRetired, setIncludeRetired] = useState(initialIncludeRetired);

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (name) params.set("name", name);
    for (const id of orgUnitIds) params.append("orgUnitId", String(id));
    if (experienceMin) params.set("experienceMin", experienceMin);
    if (experienceMax) params.set("experienceMax", experienceMax);
    for (const skill of skills) params.append("skillId", String(skill.id));
    if (skills.length > 0) params.set("skillMode", skillMode);
    for (const cert of certifications) params.append("certificationId", String(cert.id));
    if (certifications.length > 0) params.set("certificationMode", certificationMode);
    if (includeRetired) params.set("includeRetired", "true");
    router.push(`/resumes?${params.toString()}`);
  }

  return (
    <form onSubmit={applyFilters} className="flex flex-col gap-4 rounded border p-4">
      <details open className="flex flex-col gap-3">
        <summary className="cursor-pointer text-sm font-semibold">基本条件</summary>
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">氏名・カナ</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="氏名・カナで検索"
              className="rounded border px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">所属組織</span>
            <OrganizationUnitTreeFilter
              tree={orgTree}
              values={orgUnitIds}
              onChange={setOrgUnitIds}
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
        </div>
      </details>

      <details className="flex flex-col gap-3">
        <summary className="cursor-pointer text-sm font-semibold">スキル条件</summary>
        <div className="pt-2">
          <ConditionTagFilter
            label="スキル条件"
            options={skillOptions}
            selected={skills}
            onSelectedChange={setSkills}
            mode={skillMode}
            onModeChange={setSkillMode}
          />
        </div>
      </details>

      <details className="flex flex-col gap-3">
        <summary className="cursor-pointer text-sm font-semibold">取得資格条件</summary>
        <div className="pt-2">
          <ConditionTagFilter
            label="取得資格条件"
            options={certificationOptions}
            selected={certifications}
            onSelectedChange={setCertifications}
            mode={certificationMode}
            onModeChange={setCertificationMode}
          />
        </div>
      </details>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={includeRetired}
          onChange={(e) => setIncludeRetired(e.target.checked)}
        />
        退職者を含める
      </label>

      <button
        type="submit"
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        検索
      </button>
    </form>
  );
}
