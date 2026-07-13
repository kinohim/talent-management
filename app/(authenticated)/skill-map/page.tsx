import { redirect } from "next/navigation";

import {
  OrganizationUnitRadioFilter,
} from "@/components/skill-map/OrganizationUnitRadioFilter";
import { SkillHolderList, type SkillHolderGroup } from "@/components/skill-map/SkillHolderList";
import { EmploymentStatus } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { getCertificationOptions } from "@/lib/certification-options";
import { canViewEmployeeResume, getOrganizationUnitOptions } from "@/lib/organization-unit";
import { buildOrganizationUnitTree, collectDescendantIds } from "@/lib/organization-unit-tree";
import { prisma } from "@/lib/prisma";
import { aggregateCertificationHolders, aggregateSkillHolders, parseSkillMapUnitId } from "@/lib/skill-map";
import { getSkillOptions } from "@/lib/skill-options";

type SkillMapPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SkillMapPage({ searchParams }: SkillMapPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;

  const destination = await resolveDestination(user);
  if (destination !== "/") {
    redirect(destination);
  }

  const unitId = parseSkillMapUnitId(await searchParams);

  const [units, skillOptions, certificationOptions] = await Promise.all([
    getOrganizationUnitOptions(),
    getSkillOptions(),
    getCertificationOptions(),
  ]);
  const orgTree = buildOrganizationUnitTree(units);

  const unitIds = unitId != null ? collectDescendantIds(units, [unitId]) : null;

  const employees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      isRegistered: true,
      employmentStatus: EmploymentStatus.ACTIVE,
      ...(unitIds ? { organizationUnitId: { in: [...unitIds] } } : {}),
    },
    select: {
      employeeId: true,
      name: true,
      organizationUnitId: true,
      employeeSkills: { select: { skillId: true } },
      employeeCertifications: { select: { certificationId: true } },
    },
  });

  const isEmployeeRole = user.role === "EMPLOYEE";
  let viewerOrganizationUnitId: number | null = null;
  if (isEmployeeRole) {
    const viewer = await prisma.employee.findUnique({
      where: { employeeId: user.employeeId },
      select: { organizationUnitId: true },
    });
    viewerOrganizationUnitId = viewer?.organizationUnitId ?? null;
  }

  const organizationUnitIdByEmployeeId = new Map(
    employees.map((e) => [e.employeeId, e.organizationUnitId]),
  );

  function canView(targetEmployeeId: string): boolean {
    return canViewEmployeeResume({
      viewerRole: user.role,
      isSelf: targetEmployeeId === user.employeeId,
      units,
      viewerOrganizationUnitId,
      targetOrganizationUnitId: organizationUnitIdByEmployeeId.get(targetEmployeeId) ?? null,
    });
  }

  const skillGroups = aggregateSkillHolders(
    employees.map((e) => ({
      employeeId: e.employeeId,
      name: e.name ?? "",
      skillIds: [...new Set(e.employeeSkills.map((es) => es.skillId))],
    })),
    skillOptions.skills,
    skillOptions.categories,
  );
  const skillHolderGroups: SkillHolderGroup[] = skillGroups.map((group) => ({
    key: `category-${group.categoryId}`,
    label: group.categoryName,
    rows: group.skills.map((row) => ({
      key: `skill-${row.skillId}`,
      label: row.skillName,
      holders: row.holders.map((holder) => ({ ...holder, canView: canView(holder.employeeId) })),
    })),
  }));

  const certificationRows = aggregateCertificationHolders(
    employees.map((e) => ({
      employeeId: e.employeeId,
      name: e.name ?? "",
      certificationIds: [...new Set(e.employeeCertifications.map((ec) => ec.certificationId))],
    })),
    certificationOptions.certifications,
  );
  const certificationHolderGroups: SkillHolderGroup[] = [
    {
      key: "certifications",
      label: null,
      rows: certificationRows.map((row) => ({
        key: `certification-${row.certificationId}`,
        label: row.certificationName,
        holders: row.holders.map((holder) => ({
          ...holder,
          canView: canView(holder.employeeId),
        })),
      })),
    },
  ];

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">スキルマップ/組織ダッシュボード</h1>

      <div className="flex flex-col gap-2 rounded border p-4">
        <span className="text-sm font-medium">組織単位</span>
        <OrganizationUnitRadioFilter tree={orgTree} value={unitId} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">スキル別保有者数({employees.length}名中)</h2>
        <SkillHolderList
          groups={skillHolderGroups}
          totalCount={employees.length}
          emptyMessage="該当するスキル保有者はいません。"
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">資格別保有者数({employees.length}名中)</h2>
        <SkillHolderList
          groups={certificationHolderGroups}
          totalCount={employees.length}
          emptyMessage="該当する資格保有者はいません。"
        />
      </section>
    </main>
  );
}
