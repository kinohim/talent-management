import { redirect } from "next/navigation";

import Link from "next/link";

import { ResumeBasicInfoSection } from "@/components/resumes/ResumeBasicInfoSection";
import { ResumeCertificationList } from "@/components/resumes/ResumeCertificationList";
import { ResumeEducationSection } from "@/components/resumes/ResumeEducationSection";
import { ResumeExportButtons } from "@/components/resumes/ResumeExportButtons";
import { ResumeProjectList } from "@/components/resumes/ResumeProjectList";
import { ResumeSkillList } from "@/components/resumes/ResumeSkillList";
import { ResumeTextSection } from "@/components/resumes/ResumeTextSection";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import {
  canViewEmployeeResume,
  formatOrganizationUnitPath,
  getOrganizationUnitOptions,
} from "@/lib/organization-unit";
import { prisma } from "@/lib/prisma";
import { groupSkillsByCategory } from "@/lib/resume-view";

type ResumePageProps = {
  params: Promise<{ employeeId: string }>;
};

export default async function ResumePage({ params }: ResumePageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // 未登録の一般社員/管理職が直接開いた場合はEDT001へ戻す(既存ページと同じ
  // 恒常ガード)。HR_SALESはresolveDestinationが常に"/"を返すため、REF003は
  // HR_SALESも閲覧するページとして他ページのようなHR_SALES弾き出しガードは
  // 入れない。
  const destination = await resolveDestination(session.user);
  if (destination !== "/") {
    redirect(destination);
  }

  const { employeeId } = await params;

  const target = await prisma.employee.findUnique({
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

  // 対象社員が存在しない/まだ経歴書が実質存在しない(未登録)場合は安全側の
  // トップへ戻す。
  if (!target || !target.isRegistered) {
    redirect("/");
  }

  const isSelf = employeeId === session.user.employeeId;
  let allowed = isSelf || session.user.role === "HR_SALES" || session.user.role === "MANAGER";

  if (!allowed) {
    const [viewer, units] = await Promise.all([
      prisma.employee.findUnique({
        where: { employeeId: session.user.employeeId },
        select: { organizationUnitId: true },
      }),
      getOrganizationUnitOptions(),
    ]);
    allowed = canViewEmployeeResume({
      viewerRole: session.user.role,
      isSelf: false,
      units,
      viewerOrganizationUnitId: viewer?.organizationUnitId ?? null,
      targetOrganizationUnitId: target.organizationUnitId,
    });
  }

  if (!allowed) {
    redirect("/");
  }

  const skillGroups = groupSkillsByCategory(target.employeeSkills);

  return (
    <main className="flex flex-1 flex-col gap-8 p-6">
      <h1 className="text-lg font-semibold">経歴書詳細</h1>

      {!isSelf ? (
        // REF002(経歴書一覧)から遷移してきた場合の戻り導線。本人プレビュー
        // (マイページ経由)ではグローバルの「マイページに戻る」を使うため
        // 表示しない(docs/plans/2026-07-10-03-resume-detail.mdの積み残し対応)。
        <Link
          href="/resumes"
          className="inline-flex items-center gap-1 self-start text-sm text-zinc-500 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300"
        >
          <span aria-hidden="true">←</span>
          経歴書一覧に戻る
        </Link>
      ) : null}

      <ResumeBasicInfoSection
        name={target.name ?? ""}
        nameKana={target.nameKana ?? ""}
        birthDate={target.birthDate}
        gender={target.gender}
        organizationPath={formatOrganizationUnitPath(target.organizationUnit)}
        nearestStationLine={target.nearestStationLine ?? ""}
        nearestStationName={target.nearestStationName ?? ""}
        experienceYears={target.experienceYears}
      />

      <ResumeEducationSection
        finalSchoolType={target.finalSchoolType}
        finalSchoolName={target.finalSchoolName ?? ""}
        finalDepartmentName={target.finalDepartmentName ?? ""}
        graduationYearMonth={target.graduationYearMonth}
        graduationStatus={target.graduationStatus}
      />

      <ResumeTextSection title="経歴概要" content={target.careerSummary ?? ""} />
      <ResumeTextSection title="自己PR" content={target.selfPr ?? ""} />

      <ResumeSkillList groups={skillGroups} />

      <ResumeCertificationList certifications={target.employeeCertifications} />

      <ResumeProjectList projects={target.projects} />

      <ResumeExportButtons />
    </main>
  );
}
