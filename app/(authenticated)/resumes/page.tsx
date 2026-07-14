import { redirect } from "next/navigation";

import { ResumeFilterForm } from "@/components/resumes/ResumeFilterForm";
import {
  ResumeSearchResultTable,
  type ResumeSearchResultRow,
} from "@/components/resumes/ResumeSearchResultTable";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { EmploymentStatus, Prisma, UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { resolveDestination } from "@/lib/auth-routing";
import { clampPage, parsePagination, parseSort } from "@/lib/list-query";
import {
  getOrganizationUnitOptions,
  resolveResumeViewScopeUnitIds,
} from "@/lib/organization-unit";
import {
  buildOrganizationUnitTree,
  resolveEffectiveOrgUnitIds,
} from "@/lib/organization-unit-tree";
import { prisma } from "@/lib/prisma";
import {
  RESUME_SORT_KEYS,
  buildResumeOrderBy,
  parseResumeSearchFilters,
} from "@/lib/resume-search";
import { getCertificationOptions } from "@/lib/certification-options";
import { getSiteOptions } from "@/lib/project-options";
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

  const params = await searchParams;
  const filters = parseResumeSearchFilters(params);
  const pagination = parsePagination(params);
  const { sortKey, order } = parseSort(params, RESUME_SORT_KEYS);

  const [units, skillOptions, certificationOptions, siteOptions] = await Promise.all([
    getOrganizationUnitOptions(),
    getSkillOptions(),
    getCertificationOptions(),
    getSiteOptions(),
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

  // カスケード選択(上位+下位が両方選択されている場合は最深の選択配下のみ)
  const selectedOrgIds =
    filters.organizationUnitIds.length > 0
      ? resolveEffectiveOrgUnitIds(units, filters.organizationUnitIds)
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

  // 携わったプロジェクト(現場・単一選択)。過去〜現在のいずれかのプロジェクトの
  // 現場が一致すればヒット。論理削除済みプロジェクトは対象外。
  if (filters.siteId != null) {
    conditions.push({
      projects: { some: { siteId: filters.siteId, deletedAt: null } },
    });
  }

  // --- 列フィルタ(ヘッダのポップオーバーからの絞込。検索フォームとAND合成) ---
  if (filters.colName) {
    conditions.push({ name: { contains: filters.colName, mode: "insensitive" } });
  }
  if (filters.colOrganizationUnitIds.length > 0) {
    // 一般社員は閲覧範囲内のidのみ許可(スコープ外の直接指定をクランプ)
    const numericIds = filters.colOrganizationUnitIds
      .filter((v): v is number => v !== "none")
      .filter((id) => (scopeUnitIds ? scopeUnitIds.has(id) : true));
    const orConditions: Prisma.EmployeeWhereInput[] = [];
    if (numericIds.length > 0) {
      orConditions.push({ organizationUnitId: { in: numericIds } });
    }
    if (filters.colOrganizationUnitIds.includes("none")) {
      orConditions.push({ organizationUnitId: null });
    }
    if (orConditions.length > 0) {
      conditions.push({ OR: orConditions });
    }
  }
  if (filters.colExperienceMin != null) {
    conditions.push({ experienceYears: { gte: filters.colExperienceMin } });
  }
  if (filters.colExperienceMax != null) {
    conditions.push({ experienceYears: { lte: filters.colExperienceMax } });
  }
  // スキル・資格の列フィルタは検索フォームと同じ仕様(マスタ複数選択+AND/OR)
  if (filters.colSkillIds.length > 0) {
    if (filters.colSkillMatchMode === "AND") {
      for (const skillId of filters.colSkillIds) {
        conditions.push({ employeeSkills: { some: { skillId } } });
      }
    } else {
      conditions.push({
        employeeSkills: { some: { skillId: { in: filters.colSkillIds } } },
      });
    }
  }
  if (filters.colCertificationIds.length > 0) {
    if (filters.colCertificationMatchMode === "AND") {
      for (const certificationId of filters.colCertificationIds) {
        conditions.push({ employeeCertifications: { some: { certificationId } } });
      }
    } else {
      conditions.push({
        employeeCertifications: {
          some: { certificationId: { in: filters.colCertificationIds } },
        },
      });
    }
  }

  const where: Prisma.EmployeeWhereInput = { AND: conditions };

  const totalCount = await prisma.employee.count({ where });
  const { page, skip, pageCount } = clampPage(
    pagination.page,
    totalCount,
    pagination.pageSize,
  );

  const employees = await prisma.employee.findMany({
    where,
    select: {
      employeeId: true,
      name: true,
      organizationUnitId: true,
      experienceYears: true,
      employeeSkills: {
        select: { skill: { select: { skillName: true } } },
        orderBy: { skill: { skillName: "asc" } },
      },
      employeeCertifications: {
        select: { certification: { select: { certificationName: true } } },
        orderBy: { certification: { certificationName: "asc" } },
      },
    },
    orderBy: buildResumeOrderBy(sortKey, order),
    skip,
    take: pagination.pageSize,
  });

  // 一意化して上位3件+超過は「…」で省略する表示用の整形
  function summarizeNames(names: string[]): string {
    const distinct = [...new Set(names)];
    return distinct.length > 3
      ? `${distinct.slice(0, 3).join("、")}…`
      : distinct.join("、");
  }

  const rows: ResumeSearchResultRow[] = employees.map((employee) => ({
    employeeId: employee.employeeId,
    name: employee.name ?? "",
    organizationUnitName: employee.organizationUnitId
      ? (orgUnitById.get(employee.organizationUnitId)?.unitName ?? null)
      : null,
    experienceYears: employee.experienceYears,
    // 同一スキルを複数バージョンで登録している場合に名前が重複するため一意化する
    mainSkills: summarizeNames(employee.employeeSkills.map((es) => es.skill.skillName)),
    mainCertifications: summarizeNames(
      employee.employeeCertifications.map((ec) => ec.certification.certificationName),
    ),
  }));

  // 列フィルタ「所属組織」の選択肢(一般社員は閲覧範囲内のみ)。"none"=未所属
  const orgFilterOptions = [
    ...orgTreeUnits.map((u) => ({ value: String(u.id), label: u.unitName })),
    { value: "none", label: "未所属" },
  ];

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
        siteOptions={siteOptions.map((s) => ({ id: s.id, name: s.siteName }))}
        initialName={filters.name}
        initialOrgUnitIds={filters.organizationUnitIds}
        initialExperienceMin={filters.experienceMin}
        initialExperienceMax={filters.experienceMax}
        initialSkillIds={filters.skillIds}
        initialSkillMode={filters.skillMatchMode}
        initialCertificationIds={filters.certificationIds}
        initialCertificationMode={filters.certificationMatchMode}
        initialSiteId={filters.siteId}
        initialIncludeRetired={filters.includeRetired}
      />

      <div className="flex flex-col gap-2">
        <PaginationControls
          page={page}
          pageCount={pageCount}
          totalCount={totalCount}
          pageSize={pagination.pageSize}
        />
        <ResumeSearchResultTable
          rows={rows}
          orgFilterOptions={orgFilterOptions}
          skillFilterOptions={skillOptions.skills.map((s) => ({
            value: String(s.id),
            label: s.skillName,
          }))}
          certificationFilterOptions={certificationOptions.certifications.map((c) => ({
            value: String(c.id),
            label: c.certificationName,
          }))}
        />
      </div>
    </main>
  );
}
