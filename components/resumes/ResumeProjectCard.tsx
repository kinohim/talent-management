import { toDisplayYearMonth } from "@/lib/date-format";
import { buildProcessFlagLabels, formatSkillWithVersion } from "@/lib/resume-view";

type ResumeProjectCardProps = {
  project: {
    id: number;
    site: { siteName: string };
    projectTitle: string;
    industry: string | null;
    projectSummary: string | null;
    startDate: Date;
    endDate: Date | null;
    totalTeamSize: string | null;
    teamSize: string | null;
    projectDetail: {
      overview: string | null;
      researchAnalysis: boolean | null;
      requirementsDefinition: boolean | null;
      basicDesign: boolean | null;
      detailedDesign: boolean | null;
      development: boolean | null;
      testing: boolean | null;
      operation: boolean | null;
    } | null;
    projectRoleLinks: { projectRole: { projectRoleName: string } }[];
    projectSkills: {
      skill: { skillName: string };
      skillVersion: { versionName: string } | null;
    }[];
  };
};

export function ResumeProjectCard({ project }: ResumeProjectCardProps) {
  const period = `${toDisplayYearMonth(project.startDate)} 〜 ${
    project.endDate ? toDisplayYearMonth(project.endDate) : "現在"
  }`;
  const roles = project.projectRoleLinks
    .map((link) => link.projectRole.projectRoleName)
    .join("、");
  const teamSize = [project.totalTeamSize, project.teamSize]
    .filter(Boolean)
    .join(" / ");
  const processFlagLabels = buildProcessFlagLabels(project.projectDetail);
  const skills = project.projectSkills
    .map((ps) => formatSkillWithVersion(ps.skill.skillName, ps.skillVersion?.versionName ?? null))
    .join("、");

  return (
    <li className="flex break-inside-avoid flex-col gap-3 rounded border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{project.site.siteName}</span>
        <span className="text-sm text-zinc-500">{period}</span>
      </div>
      <span className="text-sm">{project.projectTitle}</span>
      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <span className="break-words text-zinc-500">業種: {project.industry || "未登録"}</span>
        <span className="break-words text-zinc-500">役割: {roles || "未登録"}</span>
        <span className="break-words text-zinc-500">規模: {teamSize || "未登録"}</span>
      </div>
      {project.projectSummary ? (
        <p className="whitespace-pre-wrap break-words text-sm">{project.projectSummary}</p>
      ) : null}
      {project.projectDetail?.overview ? (
        <p className="whitespace-pre-wrap break-words text-sm text-zinc-500">
          {project.projectDetail.overview}
        </p>
      ) : null}
      {processFlagLabels.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {processFlagLabels.map((label) => (
            <span
              key={label}
              className="rounded-full border px-3 py-1 text-xs text-zinc-500"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}
      {skills ? <p className="text-sm text-zinc-500">使用スキル: {skills}</p> : null}
    </li>
  );
}
