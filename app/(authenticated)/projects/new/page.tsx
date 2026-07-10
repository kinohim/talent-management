import { redirect } from "next/navigation";

import { ProjectForm } from "@/components/projects/ProjectForm";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { getProjectOptions } from "@/lib/project-options";
import { getSkillOptions } from "@/lib/skill-options";

export default async function NewProjectPage() {
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

  const [projectOptions, skillOptions] = await Promise.all([
    getProjectOptions(),
    getSkillOptions(),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">プロジェクト経歴登録</h1>
      <ProjectForm
        projectId={null}
        siteOptions={projectOptions.sites}
        roleOptions={projectOptions.roles}
        skillOptions={skillOptions}
        defaultValues={{
          siteId: "",
          siteNameInput: "",
          projectTitle: "",
          industry: "",
          startYearMonth: "",
          isOngoing: false,
          endYearMonth: "",
          projectSummary: "",
          roleIds: [],
          totalTeamSize: "",
          teamSize: "",
          detailOverview: "",
          researchAnalysis: false,
          requirementsDefinition: false,
          basicDesign: false,
          detailedDesign: false,
          development: false,
          testing: false,
          operation: false,
        }}
        initialSkillRows={[]}
      />
    </main>
  );
}
