import { MissingFieldPrompt } from "@/components/ui/MissingFieldPrompt";
import type { FinalSchoolType, GraduationStatus } from "@/generated/prisma/client";
import { toDisplayYearMonth } from "@/lib/date-format";
import { finalSchoolTypeLabel, graduationStatusLabel } from "@/lib/employee-labels";

type ResumeEducationSectionProps = {
  finalSchoolType: FinalSchoolType | null;
  finalSchoolName: string;
  finalDepartmentName: string;
  graduationYearMonth: Date | null;
  graduationStatus: GraduationStatus | null;
  // mypage(本人編集画面)限定: 未入力項目を前向きな促し表示にする
  promptEmptyFields?: boolean;
};

function Field({
  label,
  value,
  promptEmpty,
}: {
  label: string;
  value: string;
  promptEmpty?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-sm font-medium text-foreground/60">{label}</span>
      {value ? (
        <span className="break-words">{value}</span>
      ) : promptEmpty ? (
        <MissingFieldPrompt />
      ) : (
        <span className="break-words">未登録</span>
      )}
    </div>
  );
}

export function ResumeEducationSection({
  finalSchoolType,
  finalSchoolName,
  finalDepartmentName,
  graduationYearMonth,
  graduationStatus,
  promptEmptyFields = false,
}: ResumeEducationSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">最終学歴</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="学校種別"
          value={finalSchoolTypeLabel(finalSchoolType)}
          promptEmpty={promptEmptyFields}
        />
        <Field label="学校名" value={finalSchoolName} promptEmpty={promptEmptyFields} />
        <Field
          label="学部・学科名"
          value={finalDepartmentName}
          promptEmpty={promptEmptyFields}
        />
        <Field
          label="卒業年月"
          value={toDisplayYearMonth(graduationYearMonth)}
          promptEmpty={promptEmptyFields}
        />
        <Field
          label="卒業状況"
          value={graduationStatusLabel(graduationStatus)}
          promptEmpty={promptEmptyFields}
        />
      </div>
    </section>
  );
}
