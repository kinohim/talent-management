import Link from "next/link";
import { redirect } from "next/navigation";

import { ResumeBasicInfoSection } from "@/components/resumes/ResumeBasicInfoSection";
import { ResumeCertificationList } from "@/components/resumes/ResumeCertificationList";
import { ResumeEducationSection } from "@/components/resumes/ResumeEducationSection";
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
import { getResumeForView } from "@/lib/resume-view-data";

type ResumePageProps = {
  params: Promise<{ employeeId: string }>;
};

// 経歴書詳細(閲覧専用)。経歴書一覧の「詳細」・skill-mapの保有者名から遷移する。
// 本人・人事・営業・管理職は常に閲覧可、一般社員は閲覧範囲内のみ
// (canViewEmployeeResume)。
export default async function ResumePage({ params }: ResumePageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // 未登録の一般社員/管理職が直接開いた場合はbasic-infoへ戻す(既存ページと同じ
  // 恒常ガード)。HR_SALESはresolveDestinationが常に"/"を返すため、resume-detailは
  // HR_SALESも閲覧するページとして他ページのようなHR_SALES弾き出しガードは
  // 入れない。
  const destination = await resolveDestination(session.user);
  if (destination !== "/") {
    redirect(destination);
  }

  const { employeeId } = await params;

  const target = await getResumeForView(employeeId);

  // 対象社員が存在しない/まだ経歴書が実質存在しない(未登録)場合は安全側の
  // トップへ戻す。
  if (!target || !target.isRegistered) {
    redirect("/");
  }

  const isSelf = employeeId === session.user.employeeId;
  const isHrOrManager =
    session.user.role === "HR_SALES" || session.user.role === "MANAGER";
  let allowed = isSelf || isHrOrManager;

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">経歴書詳細</h1>
        {/* PDF出力(ダウンロード)の権限(本人・人事・営業・管理職)に合わせて
            表示する(一般社員は自分自身の詳細のみ。docs/screens.md pdf-preview)。
            配置はpdf-previewのダウンロードボタンと同じ右上・右端揃え */}
        {(isHrOrManager || isSelf) && (
          <Link
            href={`/resumes/${employeeId}/pdf-preview`}
            className="rounded border bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            PDF出力
          </Link>
        )}
      </div>

      {/* 戻り導線はグローバルのBackLink(「経歴書一覧に戻る」)に一本化している。
          本人の編集・確認は mypage「私の経歴書」が担うため、本ページ独自の
          戻りリンクは持たない。 */}

      <ResumeBasicInfoSection
        name={target.name ?? ""}
        nameKana={target.nameKana ?? ""}
        birthDate={target.birthDate}
        gender={target.gender}
        organizationPath={formatOrganizationUnitPath(target.organizationUnit)}
        nearestStationLine={target.nearestStationLine ?? ""}
        nearestStationName={target.nearestStationName ?? ""}
        experienceMonths={target.experienceMonths}
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
    </main>
  );
}
