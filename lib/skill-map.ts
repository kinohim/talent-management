type SearchParamsInput = Record<string, string | string[] | undefined>;

// REF008の組織単位選択(単一選択)。未指定/不正値はnull(=全社集計)として扱う。
export function parseSkillMapUnitId(searchParams: SearchParamsInput): number | null {
  const raw = searchParams.unitId;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

export type SkillMapHolder = { employeeId: string; name: string };

export type SkillMapEmployeeInput = {
  employeeId: string;
  name: string;
  skillIds: number[];
};

export type SkillMasterInfo = {
  id: number;
  skillName: string;
  skillCategoryId: number;
};

export type SkillCategoryInfo = {
  id: number;
  skillCategoryName: string;
};

export type SkillAggregationRow = {
  skillId: number;
  skillName: string;
  holders: SkillMapHolder[];
};

export type SkillCategoryGroup = {
  categoryId: number;
  categoryName: string;
  skills: SkillAggregationRow[];
};

// スキルごとの保有者数集計(カテゴリ別グルーピング)。呼び出し側で各社員の
// skillIdsは重複排除済み(同一スキルの複数バージョン保有は1件に集約済み)で
// あることを前提とする。保有者0人のスキルはノイズになるため含めない。
export function aggregateSkillHolders(
  employees: SkillMapEmployeeInput[],
  skills: SkillMasterInfo[],
  categories: SkillCategoryInfo[],
): SkillCategoryGroup[] {
  const holdersBySkillId = new Map<number, SkillMapHolder[]>();
  for (const employee of employees) {
    for (const skillId of employee.skillIds) {
      const holders = holdersBySkillId.get(skillId) ?? [];
      holders.push({ employeeId: employee.employeeId, name: employee.name });
      holdersBySkillId.set(skillId, holders);
    }
  }

  const skillById = new Map(skills.map((s) => [s.id, s]));
  const rowsByCategoryId = new Map<number, SkillAggregationRow[]>();
  for (const [skillId, holders] of holdersBySkillId) {
    if (holders.length === 0) continue;
    const skill = skillById.get(skillId);
    if (!skill) continue;
    const rows = rowsByCategoryId.get(skill.skillCategoryId) ?? [];
    rows.push({
      skillId,
      skillName: skill.skillName,
      holders: [...holders].sort((a, b) => a.name.localeCompare(b.name, "ja")),
    });
    rowsByCategoryId.set(skill.skillCategoryId, rows);
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  return [...rowsByCategoryId.entries()]
    .map(([categoryId, rows]) => ({
      categoryId,
      categoryName: categoryById.get(categoryId)?.skillCategoryName ?? "",
      skills: rows.sort((a, b) => a.skillName.localeCompare(b.skillName, "ja")),
    }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName, "ja"));
}

export type CertificationMapEmployeeInput = {
  employeeId: string;
  name: string;
  certificationIds: number[];
};

export type CertificationMasterInfo = {
  id: number;
  certificationName: string;
};

export type CertificationAggregationRow = {
  certificationId: number;
  certificationName: string;
  holders: SkillMapHolder[];
};

// 資格ごとの保有者数集計(カテゴリグルーピングなし、資格名昇順のフラット
// リスト)。呼び出し側で各社員のcertificationIdsは重複排除済み(同一資格の
// 再取得は1件に集約済み)であることを前提とする。保有者0人の資格は含めない。
export function aggregateCertificationHolders(
  employees: CertificationMapEmployeeInput[],
  certifications: CertificationMasterInfo[],
): CertificationAggregationRow[] {
  const holdersByCertificationId = new Map<number, SkillMapHolder[]>();
  for (const employee of employees) {
    for (const certificationId of employee.certificationIds) {
      const holders = holdersByCertificationId.get(certificationId) ?? [];
      holders.push({ employeeId: employee.employeeId, name: employee.name });
      holdersByCertificationId.set(certificationId, holders);
    }
  }

  const certificationById = new Map(certifications.map((c) => [c.id, c]));
  const rows: CertificationAggregationRow[] = [];
  for (const [certificationId, holders] of holdersByCertificationId) {
    if (holders.length === 0) continue;
    const certification = certificationById.get(certificationId);
    if (!certification) continue;
    rows.push({
      certificationId,
      certificationName: certification.certificationName,
      holders: [...holders].sort((a, b) => a.name.localeCompare(b.name, "ja")),
    });
  }

  return rows.sort((a, b) => a.certificationName.localeCompare(b.certificationName, "ja"));
}
