import type {
  FinalSchoolType,
  Gender,
  GraduationStatus,
} from "@/generated/prisma/client";
import { ResumeCertificationList } from "@/components/resumes/ResumeCertificationList";
import { ResumeProjectList } from "@/components/resumes/ResumeProjectList";
import { ResumeSkillList } from "@/components/resumes/ResumeSkillList";
import { ResumeTextSection } from "@/components/resumes/ResumeTextSection";
import { toDisplayDate, toDisplayYearMonth } from "@/lib/date-format";
import {
  finalSchoolTypeLabel,
  genderLabel,
  graduationStatusLabel,
} from "@/lib/employee-labels";
import { formatExperienceMonths } from "@/lib/experience-years";
import type {
  MaskableFieldKey,
  PrintNameMode,
  PdfPreviewSettings,
} from "@/lib/pdf-preview-settings";
import type { SkillCategoryGroup } from "@/lib/resume-view";

// サーバー側(page.tsx)で表示に必要な項目へ絞り込んだ経歴書データ。
// Prismaの結果型をそのままクライアントへ露出させないための境界型。
export type PdfResumeData = {
  name: string;
  nameKana: string;
  birthDate: Date | null;
  gender: Gender | null;
  organizationPath: string;
  nearestStationLine: string;
  nearestStationName: string;
  experienceMonths: number | null;
  finalSchoolType: FinalSchoolType | null;
  finalSchoolName: string;
  finalDepartmentName: string;
  graduationYearMonth: Date | null;
  graduationStatus: GraduationStatus | null;
  careerSummary: string;
  selfPr: string;
  skillGroups: SkillCategoryGroup[];
  certifications: Parameters<
    typeof ResumeCertificationList
  >[0]["certifications"];
  projects: Parameters<typeof ResumeProjectList>[0]["projects"];
};

export const BASIC_INFO_MASK_KEYS = [
  "kana",
  "birthDate",
  "gender",
  "organization",
  "nearestStation",
  "experience",
] as const satisfies readonly MaskableFieldKey[];

export const EDUCATION_MASK_KEYS = [
  "schoolType",
  "schoolName",
  "departmentName",
  "graduationYearMonth",
  "graduationStatus",
] as const satisfies readonly MaskableFieldKey[];

type PdfResumeDocumentProps = {
  data: PdfResumeData;
  // カナから生成したイニシャル(nullなら選択肢を非活性化)
  initials: string | null;
  settings: PdfPreviewSettings;
  // 出力される氏名(表示兼入力フィールドの現在値。空なら空欄のまま出力)
  nameValue: string;
  onChangeNameValue: (value: string) => void;
  onSelectNameMode: (mode: PrintNameMode) => void;
  onToggleMask: (key: MaskableFieldKey, masked: boolean) => void;
  // セクション一括マスク(基本情報は氏名の実名/イニシャル切替も伴う)
  onToggleSection: (keys: readonly MaskableFieldKey[], masked: boolean) => void;
};

// スイッチ型トグル(画面専用。印刷には出さない)
function MaskSwitch({
  checked,
  onChange,
  ariaLabel,
  label = "マスク",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
  label?: string;
}) {
  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-zinc-500 print:hidden">
      {label}
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={ariaLabel}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-4 w-7 rounded-full bg-zinc-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-zinc-700 peer-checked:after:translate-x-3 dark:bg-zinc-600 dark:peer-checked:bg-zinc-300 dark:after:bg-zinc-900"
      />
    </label>
  );
}

// マスク可能なフィールド。マスクONは画面上グレーアウトで残し(位置は保持)、
// 印刷からは除外して詰める。keepSpaceOnPrint(カナ)のみ印刷でも詰めず
// スペースを空けたままにする(氏名と横並びのため)。
function MaskableField({
  fieldKey,
  label,
  value,
  settings,
  onToggleMask,
  keepSpaceOnPrint = false,
}: {
  fieldKey: MaskableFieldKey;
  label: string;
  value: string;
  settings: PdfPreviewSettings;
  onToggleMask: PdfResumeDocumentProps["onToggleMask"];
  keepSpaceOnPrint?: boolean;
}) {
  const masked = settings.masked[fieldKey];
  const printClass = masked
    ? keepSpaceOnPrint
      ? "print:invisible"
      : "print:hidden"
    : "";
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${printClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-sm font-medium ${masked ? "text-zinc-400" : "text-zinc-500"}`}
        >
          {label}
        </span>
        <MaskSwitch
          checked={masked}
          onChange={(next) => onToggleMask(fieldKey, next)}
          ariaLabel={`${label}をマスクする`}
        />
      </div>
      <span className={`break-words ${masked ? "text-zinc-400" : ""}`}>
        {value || "未登録"}
      </span>
    </div>
  );
}

// セクション見出し+一括マスクトグル(配下全項目がマスクONのときON表示)
function SectionHeading({
  title,
  keys,
  settings,
  onToggleSection,
}: {
  title: string;
  keys: readonly MaskableFieldKey[];
  settings: PdfPreviewSettings;
  onToggleSection: PdfResumeDocumentProps["onToggleSection"];
}) {
  const allMasked = keys.every((key) => settings.masked[key]);
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <MaskSwitch
        checked={allMasked}
        onChange={(next) => onToggleSection(keys, next)}
        ariaLabel={`${title}を一括マスクする`}
        label="一括マスク"
      />
    </div>
  );
}

// 印刷レイアウトそのもの(A4シート)。画面上のプレビューと印刷結果が同一に
// なるよう、配色は.print-sheet(globals.css)で白背景・黒文字に固定している。
export function PdfResumeDocument({
  data,
  initials,
  settings,
  nameValue,
  onChangeNameValue,
  onSelectNameMode,
  onToggleMask,
  onToggleSection,
}: PdfResumeDocumentProps) {
  const nearestStation = [data.nearestStationLine, data.nearestStationName]
    .filter(Boolean)
    .join(" ");
  const educationAllMasked = EDUCATION_MASK_KEYS.every(
    (key) => settings.masked[key],
  );
  // 選択の押下表示は入力欄の現在値との一致で導出する(手修正すると外れる)
  const isRealSelected = nameValue === data.name;
  const isInitialSelected = initials != null && nameValue === initials;

  const nameModeButtonClass = (selected: boolean) =>
    `rounded border px-2 py-0.5 transition-colors ${
      selected
        ? "border-zinc-700 bg-zinc-700 text-white dark:border-zinc-300 dark:bg-zinc-300 dark:text-zinc-900"
        : "hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400 dark:hover:bg-zinc-800"
    }`;

  return (
    <div className="print-sheet mx-auto flex w-full max-w-[210mm] flex-col gap-8 rounded border p-8 shadow-sm print:max-w-none print:gap-6 print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <h2 className="break-after-avoid text-center text-lg font-semibold">
        経歴書
      </h2>

      <section className="flex flex-col gap-4">
        <SectionHeading
          title="基本情報"
          keys={BASIC_INFO_MASK_KEYS}
          settings={settings}
          onToggleSection={onToggleSection}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* 氏名は表示兼入力。入力欄の値がそのまま出力される(カナと横並び) */}
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-zinc-500">氏名</span>
              <div className="flex items-center gap-1 text-xs print:hidden">
                <button
                  type="button"
                  onClick={() => onSelectNameMode("real")}
                  aria-pressed={isRealSelected}
                  className={nameModeButtonClass(isRealSelected)}
                >
                  実名
                </button>
                {/* disabledなbuttonはブラウザによってhoverイベントが発火せず
                    title属性のツールチップが出ないことがあるため、ラッパの
                    spanにtitleを付けてマウスオーバーで理由を表示する */}
                <span
                  title={
                    initials == null
                      ? "カナの登録に不備があるためイニシャルを生成できません。基本情報でカナを「姓 名」（姓と名の間にスペース）の形式で登録してください。"
                      : undefined
                  }
                >
                  <button
                    type="button"
                    onClick={() => onSelectNameMode("initial")}
                    disabled={initials == null}
                    aria-pressed={isInitialSelected}
                    className={nameModeButtonClass(isInitialSelected)}
                  >
                    イニシャル{initials != null ? `（${initials}）` : ""}
                  </button>
                </span>
              </div>
            </div>
            <input
              type="text"
              value={nameValue}
              onChange={(event) => onChangeNameValue(event.target.value)}
              aria-label="出力する氏名"
              className="w-full rounded border px-2 py-1 print:hidden"
            />
            {/* 印刷時は入力欄の値をテキストとして出力する */}
            <span className="hidden break-words print:inline">{nameValue}</span>
          </div>
          <MaskableField
            fieldKey="kana"
            label="カナ"
            value={data.nameKana}
            settings={settings}
            onToggleMask={onToggleMask}
            keepSpaceOnPrint
          />
          <MaskableField
            fieldKey="birthDate"
            label="生年月日"
            value={toDisplayDate(data.birthDate)}
            settings={settings}
            onToggleMask={onToggleMask}
          />
          <MaskableField
            fieldKey="gender"
            label="性別"
            value={genderLabel(data.gender)}
            settings={settings}
            onToggleMask={onToggleMask}
          />
          <MaskableField
            fieldKey="organization"
            label="所属組織"
            value={data.organizationPath}
            settings={settings}
            onToggleMask={onToggleMask}
          />
          <MaskableField
            fieldKey="nearestStation"
            label="最寄駅"
            value={nearestStation}
            settings={settings}
            onToggleMask={onToggleMask}
          />
          <MaskableField
            fieldKey="experience"
            label="経験年数"
            value={
              data.experienceMonths != null
                ? formatExperienceMonths(data.experienceMonths)
                : ""
            }
            settings={settings}
            onToggleMask={onToggleMask}
          />
        </div>
      </section>

      {/* 全項目マスク時は印刷に見出しだけ残さない(画面上は残す) */}
      <section
        className={`flex flex-col gap-4 ${educationAllMasked ? "print:hidden" : ""}`}
      >
        <SectionHeading
          title="最終学歴"
          keys={EDUCATION_MASK_KEYS}
          settings={settings}
          onToggleSection={onToggleSection}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MaskableField
            fieldKey="schoolType"
            label="学校種別"
            value={finalSchoolTypeLabel(data.finalSchoolType)}
            settings={settings}
            onToggleMask={onToggleMask}
          />
          <MaskableField
            fieldKey="schoolName"
            label="学校名"
            value={data.finalSchoolName}
            settings={settings}
            onToggleMask={onToggleMask}
          />
          <MaskableField
            fieldKey="departmentName"
            label="学部・学科名"
            value={data.finalDepartmentName}
            settings={settings}
            onToggleMask={onToggleMask}
          />
          <MaskableField
            fieldKey="graduationYearMonth"
            label="卒業年月"
            value={toDisplayYearMonth(data.graduationYearMonth)}
            settings={settings}
            onToggleMask={onToggleMask}
          />
          <MaskableField
            fieldKey="graduationStatus"
            label="卒業状況"
            value={graduationStatusLabel(data.graduationStatus)}
            settings={settings}
            onToggleMask={onToggleMask}
          />
        </div>
      </section>

      <ResumeTextSection title="経歴概要" content={data.careerSummary} />
      <ResumeTextSection title="自己PR" content={data.selfPr} />

      <ResumeSkillList groups={data.skillGroups} />

      <ResumeCertificationList certifications={data.certifications} />

      <ResumeProjectList projects={data.projects} />
    </div>
  );
}
