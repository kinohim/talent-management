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

  // 検索対象はロールによらず全社員(docs/screens.md resume-list)。閲覧範囲は
  // 検索の限定には使わず、行ごとの「詳細」導線(resume-detailへのリンク)の
  // 出し分けにのみ使う。
  let scopeUnitIds: Set<number> | null = null;
  if (isEmployeeRole) {
    const viewer = await prisma.employee.findUnique({
      where: { employeeId: session.user.employeeId },
      select: { organizationUnitId: true },
    });
    scopeUnitIds = resolveResumeViewScopeUnitIds(units, viewer?.organizationUnitId ?? null);
  }

  const orgTree = buildOrganizationUnitTree(units);

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
    conditions.push({ experienceMonths: { gte: filters.experienceMin * 12 } });
  }
  if (filters.experienceMax != null) {
    conditions.push({ experienceMonths: { lte: filters.experienceMax * 12 + 11 } });
  }

  if (selectedOrgIds) {
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
    // 選択した組織単位の配下も含めて判定する(検索カードのカスケード選択と
    // 同じ配下展開。docs/screens.md resume-list)
    const selectedIds = filters.colOrganizationUnitIds.filter(
      (v): v is number => v !== "none",
    );
    const numericIds = [...resolveEffectiveOrgUnitIds(units, selectedIds)];
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
    conditions.push({ experienceMonths: { gte: filters.colExperienceMin * 12 } });
  }
  if (filters.colExperienceMax != null) {
    conditions.push({ experienceMonths: { lte: filters.colExperienceMax * 12 + 11 } });
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
      experienceMonths: true,
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
    // 一般社員は閲覧範囲内(+本人)の行にのみ「詳細」導線を出す。範囲外でも
    // 一覧表示はする(検索は全社員が対象)。resume-detail側でも同じ判定で
    // ガードしているため、これはUI上の出し分けであって権限境界ではない。
    canViewDetail:
      !isEmployeeRole ||
      employee.employeeId === session.user.employeeId ||
      (employee.organizationUnitId != null &&
        scopeUnitIds!.has(employee.organizationUnitId)),
    organizationUnitName: employee.organizationUnitId
      ? (orgUnitById.get(employee.organizationUnitId)?.unitName ?? null)
      : null,
    experienceYears:
      employee.experienceMonths != null
        ? Math.floor(employee.experienceMonths / 12)
        : null,
    // 同一スキルを複数バージョンで登録している場合に名前が重複するため一意化する
    mainSkills: summarizeNames(employee.employeeSkills.map((es) => es.skill.skillName)),
    mainCertifications: summarizeNames(
      employee.employeeCertifications.map((ec) => ec.certification.certificationName),
    ),
  }));

  // 列フィルタ「所属組織」の選択肢(全組織)。"none"=未所属
  const orgFilterOptions = [
    ...units.map((u) => ({ value: String(u.id), label: u.unitName })),
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
