import { genderLabel } from "@/lib/employee-labels";
import { toDisplayDate } from "@/lib/date-format";
import type { Gender } from "@/generated/prisma/client";

type ResumeBasicInfoSectionProps = {
  name: string;
  nameKana: string;
  birthDate: Date | null;
  gender: Gender | null;
  organizationPath: string;
  nearestStationLine: string;
  nearestStationName: string;
  experienceYears: number | null;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-zinc-500">{label}</span>
      <span>{value || "未登録"}</span>
    </div>
  );
}

export function ResumeBasicInfoSection({
  name,
  nameKana,
  birthDate,
  gender,
  organizationPath,
  nearestStationLine,
  nearestStationName,
  experienceYears,
}: ResumeBasicInfoSectionProps) {
  const nearestStation = [nearestStationLine, nearestStationName]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">基本情報</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="氏名" value={name} />
        <Field label="カナ" value={nameKana} />
        <Field label="生年月日" value={toDisplayDate(birthDate)} />
        <Field label="性別" value={genderLabel(gender)} />
        <Field label="所属組織" value={organizationPath} />
        <Field label="最寄駅" value={nearestStation} />
        <Field
          label="経験年数"
          value={experienceYears != null ? `${experienceYears}年` : ""}
        />
      </div>
    </section>
  );
}
