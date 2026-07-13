import { redirect } from "next/navigation";

import { ResumeFilterForm } from "@/components/resumes/ResumeFilterForm";
import {
  ResumeSearchResultTable,
  type ResumeSearchResultRow,
} from "@/components/resumes/ResumeSearchResultTable";
import { EmploymentStatus, Prisma, UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import {
  getOrganizationUnitOptions,
  resolveResumeViewScopeUnitIds,
} from "@/lib/organization-unit";
import { buildOrganizationUnitTree, collectDescendantIds } from "@/lib/organization-unit-tree";
import { prisma } from "@/lib/prisma";
import { parseResumeSearchFilters } from "@/lib/resume-search";
import { getCertificationOptions } from "@/lib/certification-options";
import { getSkillOptions } from "@/lib/skill-options";

type ResumesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResumesPage({ searchParams }: ResumesPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const destination = await resolveDestination(session.user);
  if (destination !== "/") {
    redirect(destination);
  }

  const filters = parseResumeSearchFilters(await searchParams);

  const [units, skillOptions, certificationOptions] = await Promise.all([
    getOrganizationUnitOptions(),
    getSkillOptions(),
    getCertificationOptions(),
  ]);
  const orgUnitById = new Map(units.map((u) => [u.id, u]));

  const isEmployeeRole = session.user.role === UserRole.EMPLOYEE;

  let scopeUnitIds: Set<number> | null = null;
  if (isEmployeeRole) {
    const viewer = await prisma.employee.findUnique({
      where: { employeeId: session.user.employeeId },
      select: { organizationUnitId: true },
    });
    scopeUnitIds = resolveResumeViewScopeUnitIds(units, viewer?.organizationUnitId ?? null);
  }

  // 所属組織フィルタのUI選択肢自体を、一般社員は自身の閲覧範囲内に限定する。
  const orgTreeUnits = scopeUnitIds ? units.filter((u) => scopeUnitIds!.has(u.id)) : units;
  // 閲覧範囲で絞り込むと根(部署)の親(事業部)がorgTreeUnitsに含まれずparentId
  // もnullではないため、根を明示的に指定する(親がスコープ外/nullな要素が根)。
  const orgTreeRootIds = scopeUnitIds
    ? orgTreeUnits
        .filter((u) => u.parentId == null || !scopeUnitIds!.has(u.parentId))
        .map((u) => u.id)
    : null;
  const orgTree = buildOrganizationUnitTree(orgTreeUnits, orgTreeRootIds);

  const selectedOrgIds =
    filters.organizationUnitIds.length > 0
      ? collectDescendantIds(units, filters.organizationUnitIds)
      : null;

  const conditions: Prisma.EmployeeWhereInput[] = [
    { deletedAt: null },
    { isRegistered: true },
  ];

  if (!filters.includeRetired) {
    conditions.push({ employmentStatus: EmploymentStatus.ACTIVE });
  }

  if (filters.name) {
    conditions.push({
      OR: [
        { name: { contains: filters.name, mode: "insensitive" } },
        { nameKana: { contains: filters.name, mode: "insensitive" } },
      ],
    });
  }

  if (filters.experienceMin != null) {
    conditions.push({ experienceYears: { gte: filters.experienceMin } });
  }
  if (filters.experienceMax != null) {
    conditions.push({ experienceYears: { lte: filters.experienceMax } });
  }

  if (isEmployeeRole) {
    // URLのsearchParamsはユーザー操作可能なため、選択された組織idは常に
    // 自身の閲覧範囲(scopeUnitIds)と積集合をとってからクエリに使う
    // (閲覧範囲外を直接指定されてもサーバー側でクランプする)。
    const effectiveOrgIds = selectedOrgIds
      ? [...selectedOrgIds].filter((id) => scopeUnitIds!.has(id))
      : [...scopeUnitIds!];
    conditions.push({
      OR: [
        { employeeId: session.user.employeeId },
        { organizationUnitId: { in: effectiveOrgIds } },
      ],
    });
  } else if (selectedOrgIds) {
    conditions.push({ organizationUnitId: { in: [...selectedOrgIds] } });
  }

  if (filters.skillIds.length > 0) {
    if (filters.skillMatchMode === "AND") {
      for (const skillId of filters.skillIds) {
        conditions.push({ employeeSkills: { some: { skillId } } });
      }
    } else {
      conditions.push({ employeeSkills: { some: { skillId: { in: filters.skillIds } } } });
    }
  }

  if (filters.certificationIds.length > 0) {
    if (filters.certificationMatchMode === "AND") {
      for (const certificationId of filters.certificationIds) {
        conditions.push({ employeeCertifications: { some: { certificationId } } });
      }
    } else {
      conditions.push({
        employeeCertifications: { some: { certificationId: { in: filters.certificationIds } } },
      });
    }
  }

  const employees = await prisma.employee.findMany({
    where: { AND: conditions },
    select: {
      employeeId: true,
      name: true,
      organizationUnitId: true,
      experienceYears: true,
      employeeSkills: {
        select: { skill: { select: { skillName: true } } },
        orderBy: { skill: { skillName: "asc" } },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows: ResumeSearchResultRow[] = employees.map((employee) => {
    // 同一スキルを複数バージョンで登録している場合に名前が重複するため、
    // 表示用に一意化してから上位3件に絞る。
    const distinctSkillNames = [...new Set(employee.employeeSkills.map((es) => es.skill.skillName))];
    const mainSkills =
      distinctSkillNames.length > 3
        ? `${distinctSkillNames.slice(0, 3).join("、")}…`
        : distinctSkillNames.join("、");

    return {
      employeeId: employee.employeeId,
      name: employee.name ?? "",
      organizationUnitName: employee.organizationUnitId
        ? (orgUnitById.get(employee.organizationUnitId)?.unitName ?? null)
        : null,
      experienceYears: employee.experienceYears,
      mainSkills,
    };
  });

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">経歴書一覧</h1>

      <ResumeFilterForm
        orgTree={orgTree}
        skillOptions={skillOptions.skills.map((s) => ({ id: s.id, name: s.skillName }))}
        certificationOptions={certificationOptions.certifications.map((c) => ({
          id: c.id,
          name: c.certificationName,
        }))}
        initialName={filters.name}
        initialOrgUnitIds={filters.organizationUnitIds}
        initialExperienceMin={filters.experienceMin}
        initialExperienceMax={filters.experienceMax}
        initialSkillIds={filters.skillIds}
        initialSkillMode={filters.skillMatchMode}
        initialCertificationIds={filters.certificationIds}
        initialCertificationMode={filters.certificationMatchMode}
        initialIncludeRetired={filters.includeRetired}
      />

      <ResumeSearchResultTable rows={rows} />
    </main>
  );
}
