import type { FinalSchoolType, GraduationStatus } from "@/generated/prisma/client";
import { toDisplayYearMonth } from "@/lib/date-format";
import { finalSchoolTypeLabel, graduationStatusLabel } from "@/lib/employee-labels";

type ResumeEducationSectionProps = {
  finalSchoolType: FinalSchoolType | null;
  finalSchoolName: string;
  finalDepartmentName: string;
  graduationYearMonth: Date | null;
  graduationStatus: GraduationStatus | null;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-sm font-medium text-zinc-500">{label}</span>
      <span className="break-words">{value || "未登録"}</span>
    </div>
  );
}

export function ResumeEducationSection({
  finalSchoolType,
  finalSchoolName,
  finalDepartmentName,
  graduationYearMonth,
  graduationStatus,
}: ResumeEducationSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">最終学歴</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="学校種別" value={finalSchoolTypeLabel(finalSchoolType)} />
        <Field label="学校名" value={finalSchoolName} />
        <Field label="学部・学科名" value={finalDepartmentName} />
        <Field label="卒業年月" value={toDisplayYearMonth(graduationYearMonth)} />
        <Field label="卒業状況" value={graduationStatusLabel(graduationStatus)} />
      </div>
    </section>
  );
}
