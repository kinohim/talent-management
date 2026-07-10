import { redirect } from "next/navigation";

import { ProjectForm } from "@/components/projects/ProjectForm";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { toMonthInputValue } from "@/lib/date-format";
import { getProjectOptions } from "@/lib/project-options";
import { prisma } from "@/lib/prisma";
import { getSkillOptions } from "@/lib/skill-options";

type EditProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role === UserRole.HR_SALES) {
    redirect("/");
  }

  const destination = await resolveDestination(session.user);
  if (destination !== "/") {
    redirect(destination);
  }

  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId)) {
    redirect("/projects");
  }

  const [project, projectOptions, skillOptions] = await Promise.all([
    prisma.project.findFirst({
      where: {
        id: projectId,
        employeeId: session.user.employeeId,
        deletedAt: null,
      },
      include: {
        site: true,
        projectDetail: true,
        projectRoleLinks: true,
        projectSkills: { include: { skill: true } },
      },
    }),
    getProjectOptions(),
    getSkillOptions(),
  ]);

  if (!project) {
    redirect("/projects");
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">プロジェクト経歴編集</h1>
      <ProjectForm
        projectId={project.id}
        siteOptions={projectOptions.sites}
        roleOptions={projectOptions.roles}
        skillOptions={skillOptions}
        defaultValues={{
          siteId: String(project.siteId),
          siteNameInput: project.site.siteName,
          projectTitle: project.projectTitle,
          industry: project.industry ?? "",
          startYearMonth: toMonthInputValue(project.startDate),
          isOngoing: project.endDate === null,
          endYearMonth: toMonthInputValue(project.endDate),
          projectSummary: project.projectSummary ?? "",
          roleIds: project.projectRoleLinks.map((link) => String(link.projectRoleId)),
          totalTeamSize: project.totalTeamSize ?? "",
          teamSize: project.teamSize ?? "",
          detailOverview: project.projectDetail?.overview ?? "",
          researchAnalysis: project.projectDetail?.researchAnalysis ?? false,
          requirementsDefinition:
            project.projectDetail?.requirementsDefinition ?? false,
          basicDesign: project.projectDetail?.basicDesign ?? false,
          detailedDesign: project.projectDetail?.detailedDesign ?? false,
          development: project.projectDetail?.development ?? false,
          testing: project.projectDetail?.testing ?? false,
          operation: project.projectDetail?.operation ?? false,
        }}
        initialSkillRows={project.projectSkills.map((ps) => ({
          skillCategoryId: String(ps.skill.skillCategoryId),
          skillId: String(ps.skillId),
          skillVersionId: ps.skillVersionId ? String(ps.skillVersionId) : "",
          skillNameInput: ps.skill.skillName,
        }))}
      />
    </main>
  );
}
