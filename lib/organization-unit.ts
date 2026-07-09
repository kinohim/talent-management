import type { OrganizationUnit } from "@/generated/prisma/client";
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
  const leafIdStr = selection.groupId ?? selection.departmentId ?? selection.divisionId;
  if (!leafIdStr) return null;

  const unit = await prisma.organizationUnit.findFirst({
    where: { id: Number(leafIdStr), deletedAt: null },
    select: { id: true },
  });
  return unit?.id ?? null;
}
