"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";

import {
  deleteProject,
  saveProject,
  type ProjectFormState,
} from "@/app/(authenticated)/projects/actions";
import {
  ProjectSkillRow,
  type ProjectSkillRowValue,
} from "@/components/projects/ProjectSkillRow";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PillMultiSelect } from "@/components/ui/PillMultiSelect";
import type { ProcessFlagKey } from "@/lib/project-schema";
import type { ProjectRoleOption, SiteOption } from "@/lib/project-options";
import type { SkillOptions } from "@/lib/skill-options";

const PROCESS_FLAG_OPTIONS: { key: ProcessFlagKey; label: string }[] = [
  { key: "researchAnalysis", label: "調査分析" },
  { key: "requirementsDefinition", label: "要件定義" },
  { key: "basicDesign", label: "基本設計" },
  { key: "detailedDesign", label: "詳細設計" },
  { key: "development", label: "製造" },
  { key: "testing", label: "テスト" },
  { key: "operation", label: "運用" },
];

export type ProjectFormDefaultValues = {
  siteId: string;
  siteNameInput: string;
  projectTitle: string;
  industry: string;
  startYearMonth: string;
  isOngoing: boolean;
  endYearMonth: string;
  projectSummary: string;
  roleIds: string[];
  totalTeamSize: string;
  teamSize: string;
  detailOverview: string;
  researchAnalysis: boolean;
  requirementsDefinition: boolean;
  basicDesign: boolean;
  detailedDesign: boolean;
  development: boolean;
  testing: boolean;
  operation: boolean;
};

type ProjectFormProps = {
  projectId: number | null;
  siteOptions: SiteOption[];
  roleOptions: ProjectRoleOption[];
  skillOptions: SkillOptions;
  defaultValues: ProjectFormDefaultValues;
  initialSkillRows: Omit<ProjectSkillRowValue, "key">[];
};

const initialFormState: ProjectFormState = {
  fieldErrors: {},
  skillRowErrors: {},
  formError: null,
};

function emptySkillRow(key: string): ProjectSkillRowValue & { key: string } {
  return {
    key,
    skillCategoryId: "",
    skillId: "",
    skillVersionId: "",
    skillNameInput: "",
  };
}

export function ProjectForm({
  projectId,
  siteOptions,
  roleOptions,
  skillOptions,
  defaultValues,
  initialSkillRows,
}: ProjectFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveProject,
    initialFormState,
  );
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  // 全フィールドをReact state(controlled)で保持する。検証エラーで同一画面に
  // 留まった際、React DOMのフォームaction機能が非制御フィールドを自動的に
  // フォーム定義時の初期値へリセットしてしまう(action完了ごとに一律発生する
  // 仕様)ため、素朴な defaultValue/defaultChecked では入力内容が失われる
  // (EDT003で見つかった不具合と同種。実機確認で本画面でも再現を確認したため
  // 全項目に対応する)。
  const [values, setValues] = useState<ProjectFormDefaultValues>(defaultValues);

  function setField<K extends keyof ProjectFormDefaultValues>(
    key: K,
    value: ProjectFormDefaultValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const nextSkillKeyRef = useRef(initialSkillRows.length);
  const [skillRows, setSkillRows] = useState<(ProjectSkillRowValue & { key: string })[]>(
    () => initialSkillRows.map((row, index) => ({ ...row, key: `row-${index}` })),
  );

  function handleSiteNameInput(text: string) {
    const matched = siteOptions.find((s) => s.siteName === text);
    setValues((prev) => ({
      ...prev,
      siteNameInput: text,
      siteId: matched ? String(matched.id) : "",
    }));
  }

  function addSkillRow() {
    const key = `row-${nextSkillKeyRef.current}`;
    nextSkillKeyRef.current += 1;
    setSkillRows((prev) => [...prev, emptySkillRow(key)]);
  }

  function removeSkillRow(key: string) {
    setSkillRows((prev) => prev.filter((row) => row.key !== key));
  }

  function updateSkillRow(key: string, patch: Partial<ProjectSkillRowValue>) {
    setSkillRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function handleConfirmDelete() {
    if (projectId === null) return;
    startDeleteTransition(async () => {
      await deleteProject(projectId);
    });
  }

  // 検証エラーで同一画面に留まった際、チェックボックス(役割・担当工程・現在)は
  // controlled(checked+onChange)で保持していても、React DOMのフォームaction
  // 機能による自動リセットでDOM側のchecked状態だけが desync することを実機確認
  // で確認した(valuesのReact state自体は正しいまま)。action完了ごとに全項目を
  // 再マウントし、正しいvaluesの値でDOMを再構築させる(EDT003 SkillRowsForm.tsx
  // と同じ対応)。
  const [remountToken, setRemountToken] = useState(0);
  const prevStateRef = useRef(state);
  useEffect(() => {
    if (prevStateRef.current !== state) {
      prevStateRef.current = state;
      setRemountToken((token) => token + 1);
    }
  }, [state]);

  return (
    <>
      <form action={formAction} className="flex max-w-3xl flex-col gap-6">
        <input type="hidden" name="projectId" value={projectId ?? ""} />
        <div key={remountToken} className="contents">

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            現場名 <span className="text-red-600">*</span>
          </label>
          <input
            list="site-name-options"
            value={values.siteNameInput}
            onChange={(e) => handleSiteNameInput(e.target.value)}
            placeholder="現場名を選択"
            className="rounded border px-3 py-2"
          />
          <datalist id="site-name-options">
            {siteOptions.map((s) => (
              <option key={s.id} value={s.siteName} />
            ))}
          </datalist>
          <input type="hidden" name="siteId" value={values.siteId} />
          {state.fieldErrors.siteId ? (
            <p className="text-sm text-red-600">{state.fieldErrors.siteId}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="projectTitle" className="text-sm font-medium">
            プロジェクトタイトル <span className="text-red-600">*</span>
          </label>
          <input
            id="projectTitle"
            name="projectTitle"
            type="text"
            value={values.projectTitle}
            onChange={(e) => setField("projectTitle", e.target.value)}
            className="rounded border px-3 py-2"
          />
          {state.fieldErrors.projectTitle ? (
            <p className="text-sm text-red-600">{state.fieldErrors.projectTitle}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="industry" className="text-sm font-medium">
            業種
          </label>
          <input
            id="industry"
            name="industry"
            type="text"
            value={values.industry}
            onChange={(e) => setField("industry", e.target.value)}
            className="rounded border px-3 py-2"
          />
          {state.fieldErrors.industry ? (
            <p className="text-sm text-red-600">{state.fieldErrors.industry}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="startYearMonth" className="text-sm font-medium">
              開始年月 <span className="text-red-600">*</span>
            </label>
            <input
              id="startYearMonth"
              name="startYearMonth"
              type="month"
              value={values.startYearMonth}
              onChange={(e) => setField("startYearMonth", e.target.value)}
              className="rounded border px-3 py-2"
            />
            {state.fieldErrors.startYearMonth ? (
              <p className="text-sm text-red-600">{state.fieldErrors.startYearMonth}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="endYearMonth" className="text-sm font-medium">
              終了年月
            </label>
            <input
              id="endYearMonth"
              name="endYearMonth"
              type="month"
              value={values.endYearMonth}
              onChange={(e) => setField("endYearMonth", e.target.value)}
              disabled={values.isOngoing}
              className="rounded border px-3 py-2 disabled:opacity-50"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isOngoing"
                checked={values.isOngoing}
                onChange={(e) => setField("isOngoing", e.target.checked)}
              />
              現在
            </label>
            {state.fieldErrors.endYearMonth ? (
              <p className="text-sm text-red-600">{state.fieldErrors.endYearMonth}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="projectSummary" className="text-sm font-medium">
            プロジェクト概要
          </label>
          <textarea
            id="projectSummary"
            name="projectSummary"
            value={values.projectSummary}
            onChange={(e) => setField("projectSummary", e.target.value)}
            rows={3}
            className="rounded border px-3 py-2"
          />
          {state.fieldErrors.projectSummary ? (
            <p className="text-sm text-red-600">{state.fieldErrors.projectSummary}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            役割 <span className="text-red-600">*</span>
          </span>
          <PillMultiSelect
            name="roleIds"
            options={roleOptions.map((r) => ({
              value: String(r.id),
              label: r.projectRoleName,
            }))}
            values={values.roleIds}
            onChange={(roleIds) => setField("roleIds", roleIds)}
          />
          {state.fieldErrors.roleIds ? (
            <p className="text-sm text-red-600">{state.fieldErrors.roleIds}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="totalTeamSize" className="text-sm font-medium">
              規模(全体人数)
            </label>
            <input
              id="totalTeamSize"
              name="totalTeamSize"
              type="text"
              value={values.totalTeamSize}
              onChange={(e) => setField("totalTeamSize", e.target.value)}
              className="rounded border px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="teamSize" className="text-sm font-medium">
              規模(チーム人数)
            </label>
            <input
              id="teamSize"
              name="teamSize"
              type="text"
              value={values.teamSize}
              onChange={(e) => setField("teamSize", e.target.value)}
              className="rounded border px-3 py-2"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="detailOverview" className="text-sm font-medium">
            業務詳細
          </label>
          <textarea
            id="detailOverview"
            name="detailOverview"
            value={values.detailOverview}
            onChange={(e) => setField("detailOverview", e.target.value)}
            rows={3}
            className="rounded border px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">担当工程</span>
          <div className="flex flex-wrap gap-2">
            {PROCESS_FLAG_OPTIONS.map((option) => (
              <label
                key={option.key}
                className="cursor-pointer rounded-full border px-4 py-1 text-sm has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white dark:has-[:checked]:border-zinc-100 dark:has-[:checked]:bg-zinc-100 dark:has-[:checked]:text-zinc-900"
              >
                <input
                  type="checkbox"
                  name={option.key}
                  checked={values[option.key]}
                  onChange={(e) => setField(option.key, e.target.checked)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <span className="text-sm font-medium">使用スキル</span>
          {skillRows.map((row, index) => (
            <ProjectSkillRow
              key={row.key}
              index={index}
              row={row}
              options={skillOptions}
              fieldErrors={state.skillRowErrors[index]}
              onChange={(patch) => updateSkillRow(row.key, patch)}
              onRemove={() => removeSkillRow(row.key)}
            />
          ))}
          <button
            type="button"
            onClick={addSkillRow}
            className="self-start rounded border px-4 py-2 text-sm"
          >
            + スキルを追加
          </button>
        </div>

        {state.formError ? (
          <p role="alert" className="text-sm text-red-600">
            {state.formError}
          </p>
        ) : null}

        <div className="flex items-center justify-between">
          {projectId !== null ? (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="rounded border border-red-300 px-4 py-2 text-sm text-red-600"
            >
              削除
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-zinc-900 px-6 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {isPending ? "保存中..." : "保存"}
          </button>
        </div>
        </div>
      </form>

      {showConfirm ? (
        <ConfirmDialog
          message="このプロジェクト経歴を削除してもよろしいですか？"
          isPending={isDeletePending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowConfirm(false)}
        />
      ) : null}
    </>
  );
}
