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
};

export function ResumeCertificationList({
  certifications,
}: ResumeCertificationListProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">資格一覧</h2>
      {certifications.length === 0 ? (
        <p className="text-sm text-zinc-500">登録されている資格はありません。</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {certifications.map((certification) => (
            <li
              key={certification.id}
              className="flex flex-wrap items-baseline gap-3 rounded border px-3 py-2 text-sm"
            >
              <span className="text-zinc-500">
                {toDisplayDate(certification.acquiredDate)}
              </span>
              <span className="font-medium">
                {certification.certification.certificationName}
              </span>
              <span className="text-zinc-500">
                {certification.certification.certificationOrganization}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
