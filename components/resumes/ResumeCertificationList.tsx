import { toDisplayDate } from "@/lib/date-format";

type ResumeCertificationListProps = {
  certifications: {
    id: number;
    acquiredDate: Date;
    certification: {
      certificationName: string;
      certificationOrganization: string;
    };
  }[];
  // mypageではEditableSection側が見出しを出すため内部見出しを抑制する
  hideTitle?: boolean;
};

export function ResumeCertificationList({
  certifications,
  hideTitle = false,
}: ResumeCertificationListProps) {
  return (
    <section className="flex flex-col gap-4">
      {hideTitle ? null : (
        <h2 className="text-base font-semibold">資格一覧</h2>
      )}
      {certifications.length === 0 ? (
        <p className="text-sm text-foreground/60">登録されている資格はありません。</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {certifications.map((certification) => (
            <li
              key={certification.id}
              className="flex break-inside-avoid flex-wrap items-baseline gap-3 rounded-2xl border border-surface-border px-3 py-2 text-sm"
            >
              <span className="text-foreground/60">
                {toDisplayDate(certification.acquiredDate)}
              </span>
              <span className="font-medium">
                {certification.certification.certificationName}
              </span>
              <span className="text-foreground/60">
                {certification.certification.certificationOrganization}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
