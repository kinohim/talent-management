import { MissingFieldPrompt } from "@/components/ui/MissingFieldPrompt";
import { genderLabel } from "@/lib/employee-labels";
import { toDisplayDate } from "@/lib/date-format";
import { formatExperienceMonths } from "@/lib/experience-years";
import type { Gender } from "@/generated/prisma/client";

type ResumeBasicInfoSectionProps = {
  name: string;
  nameKana: string;
  birthDate: Date | null;
  gender: Gender | null;
  organizationPath: string;
  nearestStationLine: string;
  nearestStationName: string;
  experienceMonths: number | null;
  // mypageではEditableSection側が見出しを出すため内部見出しを抑制する
  hideTitle?: boolean;
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

export function ResumeBasicInfoSection({
  name,
  nameKana,
  birthDate,
  gender,
  organizationPath,
  nearestStationLine,
  nearestStationName,
  experienceMonths,
  hideTitle = false,
  promptEmptyFields = false,
}: ResumeBasicInfoSectionProps) {
  const nearestStation = [nearestStationLine, nearestStationName]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="flex flex-col gap-4">
      {hideTitle ? null : (
        <h2 className="text-base font-semibold">基本情報</h2>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="氏名" value={name} promptEmpty={promptEmptyFields} />
        <Field label="カナ" value={nameKana} promptEmpty={promptEmptyFields} />
        <Field
          label="生年月日"
          value={toDisplayDate(birthDate)}
          promptEmpty={promptEmptyFields}
        />
        <Field label="性別" value={genderLabel(gender)} promptEmpty={promptEmptyFields} />
        <Field label="所属組織" value={organizationPath} />
        <Field label="最寄駅" value={nearestStation} promptEmpty={promptEmptyFields} />
        <Field
          label="経験年数"
          value={experienceMonths != null ? formatExperienceMonths(experienceMonths) : ""}
        />
      </div>
    </section>
  );
}
