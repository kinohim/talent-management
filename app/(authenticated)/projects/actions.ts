"use server";

import { redirect } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { parseYearMonth } from "@/lib/date-format";
import { recalculateExperienceMonths } from "@/lib/experience-years";
import {
  getProjectOptions,
  validateProjectFormAgainstMaster,
  validateProjectSkillsAgainstMaster,
} from "@/lib/project-options";
import {
  parseProjectForm,
  type ProjectFormFieldErrors,
  type ProjectSkillRowFieldErrors,
} from "@/lib/project-schema";
import { prisma } from "@/lib/prisma";
import { getSkillOptions } from "@/lib/skill-options";

export type ProjectFormState = {
  fieldErrors: ProjectFormFieldErrors;
  skillRowErrors: Record<number, ProjectSkillRowFieldErrors>;
  formError: string | null;
};

const PROGRAM = "project-form";

export async function saveProject(
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const session = await auth();
  if (!session?.user || session.user.role === UserRole.HR_SALES) {
    // 人事・営業や未ログインでの直接アクセスは想定外の防御的分岐
    redirect("/login");
  }
  const employeeId = session.user.employeeId;

  const parsed = parseProjectForm(formData);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.fieldErrors,
      skillRowErrors: parsed.skillRowErrors,
      formError: parsed.formError,
    };
  }
  const data = parsed.data;

  const [projectOptions, skillOptions] = await Promise.all([
    getProjectOptions(),
    getSkillOptions(),
  ]);

  const masterError =
    validateProjectFormAgainstMaster(data, projectOptions) ??
    validateProjectSkillsAgainstMaster(data.skills, skillOptions);
  if (masterError) {
    return { fieldErrors: {}, skillRowErrors: {}, formError: masterError };
  }

  const projectIdRaw = formData.get("projectId");
  const existingProjectId =
    typeof projectIdRaw === "string" && projectIdRaw ? Number(projectIdRaw) : null;

  if (existingProjectId) {
    const owned = await prisma.project.findFirst({
      where: { id: existingProjectId, employeeId, deletedAt: null },
      select: { id: true },
    });
    if (!owned) {
      redirect("/mypage?tab=projects");
    }
  }

  const startDate = parseYearMonth(data.startYearMonth);
  const endDate =
    !data.isOngoing && data.endYearMonth ? parseYearMonth(data.endYearMonth) : null;

  const projectFields = {
    siteId: Number(data.siteId),
    projectTitle: data.projectTitle,
    industry: data.industry ?? null,
    projectSummary: data.projectSummary ?? null,
    startDate,
    endDate,
    totalTeamSize: data.totalTeamSize ?? null,
    teamSize: data.teamSize ?? null,
  };

  try {
    await prisma.$transaction(async (tx) => {
      const project = existingProjectId
        ? await tx.project.update({
            where: { id: existingProjectId },
            data: {
              ...projectFields,
              updatedBy: employeeId,
              updatedProgram: PROGRAM,
            },
          })
        : await tx.project.create({
            data: {
              ...projectFields,
              employeeId,
              createdBy: employeeId,
              createdProgram: PROGRAM,
              updatedBy: employeeId,
              updatedProgram: PROGRAM,
            },
          });

      await tx.projectRoleLink.deleteMany({ where: { projectId: project.id } });
      await tx.projectRoleLink.createMany({
        data: data.roleIds.map((roleId) => ({
          projectId: project.id,
          projectRoleId: Number(roleId),
          createdBy: employeeId,
          createdProgram: PROGRAM,
          updatedBy: employeeId,
          updatedProgram: PROGRAM,
        })),
      });

      const detailFields = {
        overview: data.detailOverview ?? null,
        researchAnalysis: data.researchAnalysis,
        requirementsDefinition: data.requirementsDefinition,
        basicDesign: data.basicDesign,
        detailedDesign: data.detailedDesign,
        development: data.development,
        testing: data.testing,
        operation: data.operation,
      };
      await tx.projectDetail.upsert({
        where: { projectId: project.id },
        create: {
          projectId: project.id,
          ...detailFields,
          createdBy: employeeId,
          createdProgram: PROGRAM,
          updatedBy: employeeId,
          updatedProgram: PROGRAM,
        },
        update: {
          ...detailFields,
          updatedBy: employeeId,
          updatedProgram: PROGRAM,
        },
      });

      await tx.projectSkill.deleteMany({ where: { projectId: project.id } });
      if (data.skills.length > 0) {
        await tx.projectSkill.createMany({
          data: data.skills.map((skill) => ({
            projectId: project.id,
            skillId: Number(skill.skillId),
            skillVersionId: skill.skillVersionId ? Number(skill.skillVersionId) : null,
            createdBy: employeeId,
            createdProgram: PROGRAM,
            updatedBy: employeeId,
            updatedProgram: PROGRAM,
          })),
        });
      }

      await recalculateExperienceMonths(tx, employeeId);
    });
  } catch {
    return {
      fieldErrors: {},
      skillRowErrors: {},
      formError: "保存に失敗しました。時間をおいて再度お試しください。",
    };
  }

  // 保存後はmypage[実績]タブ(プロジェクト経歴一覧)へ遷移する(docs/screens.md project-form参照)。
  redirect("/mypage?tab=projects");
}

export async function deleteProject(projectId: number): Promise<void> {
  const session = await auth();
  if (!session?.user || session.user.role === UserRole.HR_SALES) {
    redirect("/login");
  }
  const employeeId = session.user.employeeId;

  const project = await prisma.project.findFirst({
    where: { id: projectId, employeeId, deletedAt: null },
    select: { id: true },
  });
  if (!project) {
    redirect("/mypage?tab=projects");
  }

  const deletedAt = new Date();
  const auditDelete = {
    deletedAt,
    deletedBy: employeeId,
    deletedProgram: PROGRAM,
  };

  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id: projectId }, data: auditDelete });
    await tx.projectDetail.updateMany({
      where: { projectId, deletedAt: null },
      data: auditDelete,
    });
    await tx.projectSkill.updateMany({
      where: { projectId, deletedAt: null },
      data: auditDelete,
    });
    await tx.projectRoleLink.updateMany({
      where: { projectId, deletedAt: null },
      data: auditDelete,
    });

    await recalculateExperienceMonths(tx, employeeId);
  });

  redirect("/mypage?tab=projects");
}
