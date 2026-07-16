import { redirect } from "next/navigation";

import { BasicInfoForm } from "@/components/basic-info/BasicInfoForm";
import { CareerSummaryForm } from "@/components/career-summary/CareerSummaryForm";
import { CertificationRowsForm } from "@/components/certifications/CertificationRowsForm";
import { EditableSection } from "@/components/my-resume/EditableSection";
import { MyResumeTabs } from "@/components/my-resume/MyResumeTabs";
import { ProjectListPanel } from "@/components/projects/ProjectListPanel";
import { ResumeBasicInfoSection } from "@/components/resumes/ResumeBasicInfoSection";
import { ResumeCertificationList } from "@/components/resumes/ResumeCertificationList";
import { ResumeEducationSection } from "@/components/resumes/ResumeEducationSection";
import { ResumeExportButtons } from "@/components/resumes/ResumeExportButtons";
import { ResumeSkillList } from "@/components/resumes/ResumeSkillList";
import { ResumeTextSection } from "@/components/resumes/ResumeTextSection";
import { SkillRowsForm } from "@/components/skills/SkillRowsForm";
import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { getCertificationOptions } from "@/lib/certification-options";
import { toDateInputValue, toMonthInputValue } from "@/lib/date-format";
import { parseMyResumeTab } from "@/lib/my-resume-tabs";
import {
  formatOrganizationUnitPath,
  getOrganizationUnitOptions,
  resolveSelectionFromLeaf,
} from "@/lib/organization-unit";
import { prisma } from "@/lib/prisma";
import { groupSkillsByCategory } from "@/lib/resume-view";
import { getSkillOptions } from "@/lib/skill-options";

type MyPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// mypage「私の経歴書」。プレビュー(resume-detail)と同じ閲覧表示をベースに、
// [表紙]タブでは各セクションを編集モードに切り替えてその場で保存できる。
// [実績]タブはプロジェクト経歴一覧(登録・編集はproject-formへ遷移)。
export default async function MyPage({ searchParams }: MyPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role === UserRole.HR_SALES) {
    // 人事・営業は経歴書を作成しないため対象外(home参照)
    redirect("/");
  }

  // 未登録の一般社員/管理職が直接/mypageを開いた場合もbasic-infoへ戻す恒常ガード
  // (homeと同じ方針)。
  const destination = await resolveDestination(session.user);
  if (destination !== "/") {
    redirect(destination);
  }

  const initialTab = parseMyResumeTab((await searchParams).tab);
  const employeeId = session.user.employeeId;

  const [employee, units, skillOptions, certificationOptions] = await Promise.all([
    prisma.employee.findUnique({
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
            projectRoleLinks: { include: { projectRole: true } },
          },
          orderBy: { startDate: "desc" },
        },
      },
    }),
    getOrganizationUnitOptions(),
    getSkillOptions(),
    getCertificationOptions(),
  ]);
  if (!employee) {
    // users<->employeeはFKで保証されるため通常到達しない
    redirect("/login");
  }

  const skillGroups = groupSkillsByCategory(employee.employeeSkills);
  const organizationSelection = resolveSelectionFromLeaf(
    units,
    employee.organizationUnitId,
  );

  // 編集フォームの初期値整形(旧スキル登録・資格登録の単独ページから移植)
  const initialSkillRows = employee.employeeSkills.map((employeeSkill) => ({
    skillCategoryId: String(employeeSkill.skill.skillCategoryId),
    skillId: String(employeeSkill.skillId),
    skillNameInput: employeeSkill.skill.skillName,
    skillVersionId: employeeSkill.skillVersionId
      ? String(employeeSkill.skillVersionId)
      : "",
    skillLevel: employeeSkill.skillLevel as string,
  }));

  const initialCertificationRows = employee.employeeCertifications.map(
    (employeeCertification) => ({
      certificationCategoryId: String(
        employeeCertification.certification.certificationCategoryId,
      ),
      certificationId: String(employeeCertification.certificationId),
      certificationNameInput:
        employeeCertification.certification.certificationName,
      acquiredDate: toDateInputValue(employeeCertification.acquiredDate),
      expirationDate: toDateInputValue(employeeCertification.expirationDate),
    }),
  );

  const coverPanel = (
    <div className="flex flex-col gap-6">
      <EditableSection
        title="基本情報"
        view={
          <div className="flex flex-col gap-8">
            <ResumeBasicInfoSection
              hideTitle
              name={employee.name ?? ""}
              nameKana={employee.nameKana ?? ""}
              birthDate={employee.birthDate}
              gender={employee.gender}
              organizationPath={formatOrganizationUnitPath(employee.organizationUnit)}
              nearestStationLine={employee.nearestStationLine ?? ""}
              nearestStationName={employee.nearestStationName ?? ""}
              experienceMonths={employee.experienceMonths}
            />
            <ResumeEducationSection
              finalSchoolType={employee.finalSchoolType}
              finalSchoolName={employee.finalSchoolName ?? ""}
              finalDepartmentName={employee.finalDepartmentName ?? ""}
              graduationYearMonth={employee.graduationYearMonth}
              graduationStatus={employee.graduationStatus}
            />
          </div>
        }
        form={
          <BasicInfoForm
            variant="section"
            employeeId={employeeId}
            email={session.user.email ?? ""}
            defaultValues={{
              name: employee.name ?? session.user.name ?? "",
              nameKana: employee.nameKana ?? "",
              birthDate: toDateInputValue(employee.birthDate),
              gender: employee.gender,
              nearestStationLine: employee.nearestStationLine ?? "",
              nearestStationName: employee.nearestStationName ?? "",
              finalSchoolType: employee.finalSchoolType,
              finalSchoolName: employee.finalSchoolName ?? "",
              finalDepartmentName: employee.finalDepartmentName ?? "",
              graduationStatus: employee.graduationStatus,
              graduationYearMonth: toMonthInputValue(employee.graduationYearMonth),
            }}
            units={units}
            selection={organizationSelection}
          />
        }
      />

      <EditableSection
        title="経歴概要・自己PR"
        view={
          <div className="flex flex-col gap-8">
            <ResumeTextSection title="経歴概要" content={employee.careerSummary ?? ""} />
            <ResumeTextSection title="自己PR" content={employee.selfPr ?? ""} />
          </div>
        }
        form={
          <CareerSummaryForm
            defaultValues={{
              careerSummary: employee.careerSummary ?? "",
              selfPr: employee.selfPr ?? "",
            }}
          />
        }
      />

      <EditableSection
        title="スキル"
        view={<ResumeSkillList hideTitle groups={skillGroups} />}
        form={<SkillRowsForm options={skillOptions} initialRows={initialSkillRows} />}
      />

      <EditableSection
        title="資格"
        view={<ResumeCertificationList hideTitle certifications={employee.employeeCertifications} />}
        form={
          <CertificationRowsForm
            options={certificationOptions}
            initialRows={initialCertificationRows}
          />
        }
      />

      <ResumeExportButtons />
    </div>
  );

  const projectsPanel = (
    <ProjectListPanel
      projects={employee.projects.map((project) => ({
        id: project.id,
        startDate: project.startDate,
        endDate: project.endDate,
        siteName: project.site.siteName,
        roleNames: project.projectRoleLinks.map(
          (link) => link.projectRole.projectRoleName,
        ),
      }))}
    />
  );

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">私の経歴書</h1>
      <MyResumeTabs
        initialTab={initialTab}
        coverPanel={coverPanel}
        projectsPanel={projectsPanel}
      />
    </main>
  );
}
