import { redirect } from "next/navigation";

import { SkillMapDashboard } from "@/components/skill-map/SkillMapDashboard";
import { EmploymentStatus } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { getCertificationOptions } from "@/lib/certification-options";
import { toDateInputValue, todayJstDateOnly } from "@/lib/date-format";
import {
  canViewEmployeeResume,
  getOrganizationUnitOptions,
  resolveSelectionFromLeaf,
} from "@/lib/organization-unit";
import { prisma } from "@/lib/prisma";
import {
  assignBucketIds,
  buildDepartmentBuckets,
  collectFiscalYearAcquisitions,
  deptLabelOf,
  fiscalYearOf,
  totalCertificationCount,
  trendAxisMax,
  type DashboardEmployee,
  type DashboardItem,
} from "@/lib/skill-map";
import { getSkillOptions } from "@/lib/skill-options";

export default async function SkillMapPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;

  const destination = await resolveDestination(user);
  if (destination !== "/") {
    redirect(destination);
  }

  // 本画面の保有者名は全社公開のため、部署・カテゴリの絞り込みはすべて
  // クライアント側で行う(docs/dashboard-design.md)。ここでは全社分を
  // 一括取得してDTOに整形する。
  const [units, skillOptions, certificationOptions, employeeRecords, myCertifications] =
    await Promise.all([
      getOrganizationUnitOptions(),
      getSkillOptions(),
      getCertificationOptions(),
      prisma.employee.findMany({
        where: {
          deletedAt: null,
          isRegistered: true,
          employmentStatus: EmploymentStatus.ACTIVE,
        },
        select: {
          employeeId: true,
          name: true,
          organizationUnitId: true,
          employeeSkills: {
            where: { deletedAt: null },
            select: { skillId: true },
          },
          employeeCertifications: {
            where: { deletedAt: null },
            select: { certificationId: true, acquiredDate: true },
          },
        },
      }),
      // 💡おすすめ判定用のログインユーザー保有資格
      prisma.employeeCertification.findMany({
        where: { employeeId: user.employeeId, deletedAt: null },
        select: { certificationId: true },
      }),
    ]);

  // 閲覧範囲判定(一般社員のみ使用)とヒートマップ初期表示行(全ロール)の
  // 両方で使うため、ログインユーザーの所属は常に取得する
  const viewer = await prisma.employee.findUnique({
    where: { employeeId: user.employeeId },
    select: { organizationUnitId: true },
  });
  const viewerOrganizationUnitId = viewer?.organizationUnitId ?? null;
  const viewerDivisionId = resolveSelectionFromLeaf(
    units,
    viewerOrganizationUnitId,
  ).divisionId;

  const employees: DashboardEmployee[] = employeeRecords.map((e) => ({
    employeeId: e.employeeId,
    name: e.name ?? "",
    deptLabel: deptLabelOf(units, e.organizationUnitId),
    bucketIds: assignBucketIds(units, e.organizationUnitId),
    canView: canViewEmployeeResume({
      viewerRole: user.role,
      isSelf: e.employeeId === user.employeeId,
      units,
      viewerOrganizationUnitId,
      targetOrganizationUnitId: e.organizationUnitId,
    }),
  }));

  const certificationHoldings = new Map<
    number,
    { employeeId: string; acquiredDate: string }[]
  >();
  const skillHoldings = new Map<number, { employeeId: string }[]>();
  for (const e of employeeRecords) {
    for (const ec of e.employeeCertifications) {
      const holdings = certificationHoldings.get(ec.certificationId) ?? [];
      holdings.push({
        employeeId: e.employeeId,
        acquiredDate: toDateInputValue(ec.acquiredDate),
      });
      certificationHoldings.set(ec.certificationId, holdings);
    }
    // 同一スキルの複数バージョン保有は保有1件に集約する
    const skillIds = new Set(e.employeeSkills.map((es) => es.skillId));
    for (const skillId of skillIds) {
      const holdings = skillHoldings.get(skillId) ?? [];
      holdings.push({ employeeId: e.employeeId });
      skillHoldings.set(skillId, holdings);
    }
  }

  const certifications: DashboardItem[] = certificationOptions.certifications.map(
    (c) => ({
      id: c.id,
      name: c.certificationName,
      categoryId: c.certificationCategoryId,
      holdings: certificationHoldings.get(c.id) ?? [],
    }),
  );
  const skills: DashboardItem[] = skillOptions.skills.map((s) => ({
    id: s.id,
    name: s.skillName,
    categoryId: s.skillCategoryId,
    holdings: skillHoldings.get(s.id) ?? [],
  }));

  const today = toDateInputValue(todayJstDateOnly());
  const currentFiscalYear = fiscalYearOf(today);
  const tickerItems = collectFiscalYearAcquisitions(
    certifications,
    employees,
    currentFiscalYear,
    today,
  );

  return (
    <SkillMapDashboard
      data={{
        today,
        currentFiscalYear,
        buckets: buildDepartmentBuckets(units, employees),
        certCategories: certificationOptions.categories.map((c) => ({
          id: c.id,
          name: c.certificationCategoryName,
        })),
        skillCategories: skillOptions.categories.map((c) => ({
          id: c.id,
          name: c.skillCategoryName,
        })),
        certifications,
        skills,
        employees,
        myCertificationIds: myCertifications.map((c) => c.certificationId),
        viewerDivisionId,
        kpiTotal: totalCertificationCount(certifications),
        tickerItems,
        trendAxisMax: trendAxisMax(certifications, currentFiscalYear),
      }}
    />
  );
}
