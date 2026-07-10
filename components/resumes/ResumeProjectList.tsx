import { ResumeProjectCard } from "@/components/resumes/ResumeProjectCard";

type ResumeProjectListProps = {
  projects: Parameters<typeof ResumeProjectCard>[0]["project"][];
};

export function ResumeProjectList({ projects }: ResumeProjectListProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">プロジェクト経歴</h2>
      {projects.length === 0 ? (
        <p className="text-sm text-zinc-500">
          登録されているプロジェクト経歴はありません。
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {projects.map((project) => (
            <ResumeProjectCard key={project.id} project={project} />
          ))}
        </ul>
      )}
    </section>
  );
}
