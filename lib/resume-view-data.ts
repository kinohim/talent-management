import type { PdfResumeData } from "@/components/pdf-preview/PdfResumeDocument";
import { formatOrganizationUnitPath } from "@/lib/organization-unit";
import { prisma } from "@/lib/prisma";
import { groupSkillsByCategory } from "@/lib/resume-view";

// 経歴書の閲覧・出力(resume-detail / pdf-preview)用の経歴書データ取得。
// 全項目表示に必要なフルinclude(projectDetail・projectSkillsを含む)で取得
// する(mypageの軽量includeは使わない)。ロジックを持たない薄いクエリのため、
// テスト方針(lib純関数のみ)上のテスト対象外。
export async function getResumeForView(employeeId: string) {
  return prisma.employee.findUnique({
    where: { employeeId },
    include: {
      organizationUnit: { include: { parent: { include: { parent: true } } } },
      employeeSkills: {
        include: {
          skill: { include: { skillCategory: true } },
          skillVersion: true,
        },
        orderBy: [
          { skill: { skillCategory: { skillCategoryName: "asc" } } },
          { skill: { skillName: "asc" } },
        ],
      },
      employeeCertifications: {
        include: { certification: true },
        orderBy: { acquiredDate: "asc" },
      },
      projects: {
        where: { deletedAt: null },
        include: {
          site: true,
          projectDetail: true,
          projectRoleLinks: { include: { projectRole: true } },
          projectSkills: { include: { skill: true, skillVersion: true } },
        },
        orderBy: { startDate: "desc" },
      },
    },
  });
}

type ResumeForPrint = NonNullable<Awaited<ReturnType<typeof getResumeForView>>>;

// Prismaの取得結果を表示に必要な項目だけのplain objectへ絞り込む
// (クライアントコンポーネントへ渡すRSCペイロードに内部カラムを載せない)。
export function buildPdfResumeData(employee: ResumeForPrint): PdfResumeData {
  return {
    name: employee.name ?? "",
    nameKana: employee.nameKana ?? "",
    birthDate: employee.birthDate,
    gender: employee.gender,
    organizationPath: formatOrganizationUnitPath(employee.organizationUnit),
    nearestStationLine: employee.nearestStationLine ?? "",
    nearestStationName: employee.nearestStationName ?? "",
    experienceMonths: employee.experienceMonths,
    finalSchoolType: employee.finalSchoolType,
    finalSchoolName: employee.finalSchoolName ?? "",
    finalDepartmentName: employee.finalDepartmentName ?? "",
    graduationYearMonth: employee.graduationYearMonth,
    graduationStatus: employee.graduationStatus,
    careerSummary: employee.careerSummary ?? "",
    selfPr: employee.selfPr ?? "",
    skillGroups: groupSkillsByCategory(employee.employeeSkills),
    certifications: employee.employeeCertifications.map((row) => ({
      id: row.id,
      acquiredDate: row.acquiredDate,
      certification: {
        certificationName: row.certification.certificationName,
        certificationOrganization: row.certification.certificationOrganization,
      },
    })),
    projects: employee.projects.map((project) => ({
      id: project.id,
      site: { siteName: project.site.siteName },
      projectTitle: project.projectTitle,
      industry: project.industry,
      projectSummary: project.projectSummary,
      startDate: project.startDate,
      endDate: project.endDate,
      totalTeamSize: project.totalTeamSize,
      teamSize: project.teamSize,
      projectDetail: project.projectDetail
        ? {
            overview: project.projectDetail.overview,
            researchAnalysis: project.projectDetail.researchAnalysis,
            requirementsDefinition: project.projectDetail.requirementsDefinition,
            basicDesign: project.projectDetail.basicDesign,
            detailedDesign: project.projectDetail.detailedDesign,
            development: project.projectDetail.development,
            testing: project.projectDetail.testing,
            operation: project.projectDetail.operation,
          }
        : null,
      projectRoleLinks: project.projectRoleLinks.map((link) => ({
        projectRole: { projectRoleName: link.projectRole.projectRoleName },
      })),
      projectSkills: project.projectSkills.map((ps) => ({
        skill: { skillName: ps.skill.skillName },
        skillVersion: ps.skillVersion
          ? { versionName: ps.skillVersion.versionName }
          : null,
      })),
    })),
  };
}
