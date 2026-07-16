import type { OrganizationUnit } from "@/generated/prisma/client";
import { UserRole } from "@/generated/prisma/client";
import { collectDescendantIds } from "@/lib/organization-unit-tree";
import { prisma } from "@/lib/prisma";

export type OrganizationUnitOption = Pick<
  OrganizationUnit,
  "id" | "parentId" | "unitName" | "unitLevel"
>;

export async function getOrganizationUnitOptions(): Promise<
  OrganizationUnitOption[]
> {
  return prisma.organizationUnit.findMany({
    where: { deletedAt: null },
    select: { id: true, parentId: true, unitName: true, unitLevel: true },
    orderBy: [{ unitLevel: "asc" }, { unitName: "asc" }],
  });
}

export type OrganizationUnitSelection = {
  divisionId: number | null;
  departmentId: number | null;
  groupId: number | null;
};

// 保存済みの最下層id(employee.organizationUnitId)から、
// 3つのセレクトボックスの初期選択値を逆算する(編集時の初期表示用)。
export function resolveSelectionFromLeaf(
  units: OrganizationUnitOption[],
  leafId: number | null,
): OrganizationUnitSelection {
  const selection: OrganizationUnitSelection = {
    divisionId: null,
    departmentId: null,
    groupId: null,
  };
  if (leafId == null) return selection;

  const byId = new Map(units.map((u) => [u.id, u]));
  let current = byId.get(leafId) ?? null;
  while (current) {
    if (current.unitLevel === "DIVISION") selection.divisionId = current.id;
    if (current.unitLevel === "DEPARTMENT") selection.departmentId = current.id;
    if (current.unitLevel === "GROUP") selection.groupId = current.id;
    current = current.parentId != null ? byId.get(current.parentId) ?? null : null;
  }
  return selection;
}

// フォームから送られた3階層の選択値のうち、最下層のidを採用する。
// (事業部/部署/Grの祖先関係の再検証はしない。これは特権境界ではなく
//  本人の所属メタデータの自己申告であり、送信された最下層idがDB上に
//  実在し削除されていないことだけを保証すれば十分と判断している)
export async function resolveOrganizationUnitId(selection: {
  divisionId?: string;
  departmentId?: string;
  groupId?: string;
}): Promise<number | null> {
  // 3つの<select>は下位階層ほど「未選択(空文字)」でもDOM上は有効化されて
  // FormDataに含まれるため、`??`だと空文字が真値として扱われ上位階層の値まで
  // 届かない(例: 事業部のみ選択時、部署select("")がgroupIdより先に採用され
  // てしまう)。空文字はnullish扱いにするため`||`で判定する。
  const leafIdStr = selection.groupId || selection.departmentId || selection.divisionId;
  if (!leafIdStr) return null;

  const unit = await prisma.organizationUnit.findFirst({
    where: { id: Number(leafIdStr), deletedAt: null },
    select: { id: true },
  });
  return unit?.id ?? null;
}

// 一般社員が他の社員の経歴書を閲覧できるかの判定(resume-list冒頭の判定ルール(a)(b)(c))。
// 双方とも部署以下(部署/Gr)に所属していれば部署の一致、どちらかが事業部直下
// 所属なら事業部の一致で判定する。unitsはDBを1回だけ取得したものを呼び出し側が渡す。
export function isWithinResumeViewScope(
  units: OrganizationUnitOption[],
  viewerOrganizationUnitId: number | null,
  targetOrganizationUnitId: number | null,
): boolean {
  if (viewerOrganizationUnitId == null || targetOrganizationUnitId == null) {
    return false; // (c) 未所属は見る側・見られる側のどちらにもならない
  }

  const viewer = resolveSelectionFromLeaf(units, viewerOrganizationUnitId);
  const target = resolveSelectionFromLeaf(units, targetOrganizationUnitId);
  if (viewer.divisionId == null || target.divisionId == null) {
    return false;
  }

  const viewerIsDivisionDirect = viewer.departmentId == null;
  const targetIsDivisionDirect = target.departmentId == null;
  if (viewerIsDivisionDirect || targetIsDivisionDirect) {
    return viewer.divisionId === target.divisionId; // (b)
  }
  return viewer.departmentId === target.departmentId; // (a)
}

// resume-list(経歴書一覧)で一般社員が検索対象にできる組織単位id集合(閲覧範囲
// ルールa/bをまとめて1回の集合計算に落とし込んだもの。判定ロジック自体は
// isWithinResumeViewScopeと同じ規則)。事業部直下所属なら事業部全体、
// 部署以下所属なら遡って到達する部署とその配下(Gr)に加え、事業部直下所属者
// (ルールbで相手が事業部直下なら双方向で許可されるため)も対象に含める。
// 未所属なら空集合を返す(ルールc。本人はemployeeIdの別枠一致で引き続き
// 検索可能)。
export function resolveResumeViewScopeUnitIds(
  units: OrganizationUnitOption[],
  viewerOrganizationUnitId: number | null,
): Set<number> {
  const viewer = resolveSelectionFromLeaf(units, viewerOrganizationUnitId);
  if (viewer.divisionId == null) return new Set();

  if (viewer.departmentId == null) {
    return collectDescendantIds(units, [viewer.divisionId]);
  }
  const scope = collectDescendantIds(units, [viewer.departmentId]);
  scope.add(viewer.divisionId);
  return scope;
}

// resume-detail(経歴書詳細)のアクセス可否。本人・人事・営業・管理職は常に閲覧可、
// 一般社員が他社員を見る場合のみ閲覧範囲判定に従う。
export function canViewEmployeeResume(params: {
  viewerRole: UserRole;
  isSelf: boolean;
  units: OrganizationUnitOption[];
  viewerOrganizationUnitId: number | null;
  targetOrganizationUnitId: number | null;
}): boolean {
  if (params.isSelf) return true;
  if (
    params.viewerRole === UserRole.HR_SALES ||
    params.viewerRole === UserRole.MANAGER
  ) {
    return true;
  }
  return isWithinResumeViewScope(
    params.units,
    params.viewerOrganizationUnitId,
    params.targetOrganizationUnitId,
  );
}

type OrganizationUnitPathNode = {
  unitName: string;
  // 事業部(unitLevel=DIVISION)はparentを持たないため、DBのinclude段数に
  // よっては`parent`キー自体が型上存在しない場合がある(optional)。
  parent?: OrganizationUnitPathNode | null;
};

// 所属組織を「事業部 / 部署 / Gr」の形式で連結する(resume-detailの所属組織表示用)。
export function formatOrganizationUnitPath(
  leaf: OrganizationUnitPathNode | null,
): string {
  if (!leaf) return "未所属";
  const names: string[] = [];
  let current: OrganizationUnitPathNode | null | undefined = leaf;
  while (current) {
    names.unshift(current.unitName);
    current = current.parent;
  }
  return names.join(" / ");
}

// master-org-unitsの削除制約(docs/screens.md「配下または所属社員が存在する行は削除
// 不可」)。ブロック理由があればエラーメッセージを、削除可能ならnullを返す。
export async function getOrganizationUnitDeleteBlockReason(
  unitId: number,
): Promise<string | null> {
  const [childCount, employeeCount, siteCount] = await Promise.all([
    prisma.organizationUnit.count({
      where: { parentId: unitId, deletedAt: null },
    }),
    prisma.employee.count({
      where: { organizationUnitId: unitId, deletedAt: null },
    }),
    // 現場マスタの主管部署としての参照(master-sites)
    prisma.site.count({
      where: { organizationUnitId: unitId, deletedAt: null },
    }),
  ]);
  if (childCount > 0 || employeeCount > 0 || siteCount > 0) {
    return "使用中のため削除できません";
  }
  return null;
}
