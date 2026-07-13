import type { OrganizationUnitLevel } from "@/generated/prisma/client";
import type { OrganizationUnitOption } from "@/lib/organization-unit";

// このファイルはUserRole/prismaの値importを一切持たない(型のみ)。
// クライアントコンポーネント(OrganizationUnitNodeItem等)から直接importされる
// ため、prismaランタイムを巻き込まないよう`lib/organization-unit.ts`とは
// 分離している。

export type OrganizationUnitNode = OrganizationUnitOption & {
  children: OrganizationUnitNode[];
};

// MST004(部署マスタ管理)の階層インデント表示用。フラットな一覧を
// parentIdでグルーピングし、事業部>部署>Grのツリーに組み立てる。
// 各階層内はunitNameの昇順。
export function buildOrganizationUnitTree(
  units: OrganizationUnitOption[],
): OrganizationUnitNode[] {
  const byParent = new Map<number | null, OrganizationUnitOption[]>();
  for (const unit of units) {
    const siblings = byParent.get(unit.parentId) ?? [];
    siblings.push(unit);
    byParent.set(unit.parentId, siblings);
  }

  function build(parentId: number | null): OrganizationUnitNode[] {
    const siblings = byParent.get(parentId) ?? [];
    return [...siblings]
      .sort((a, b) => a.unitName.localeCompare(b.unitName, "ja"))
      .map((unit) => ({ ...unit, children: build(unit.id) }));
  }

  return build(null);
}

// 親の階層から、その配下に追加できる子の階層を返す。Grより下は存在しない
// ため、親がGROUPの場合はnull(「配下に追加」ボタンを表示しない基準)。
export function deriveChildLevel(
  parentLevel: OrganizationUnitLevel | null,
): OrganizationUnitLevel | null {
  if (parentLevel === null) return "DIVISION";
  if (parentLevel === "DIVISION") return "DEPARTMENT";
  if (parentLevel === "DEPARTMENT") return "GROUP";
  return null;
}

// REF007(アカウント一覧)の所属組織フィルタ用。選択された組織単位idに、
// その配下すべて(子・孫…)のidを加えたSetを返す(上位を選ぶと配下も
// 対象に含まれる階層フィルタの挙動)。
export function collectDescendantIds(
  units: OrganizationUnitOption[],
  selectedIds: number[],
): Set<number> {
  const childrenByParent = new Map<number, number[]>();
  for (const unit of units) {
    if (unit.parentId == null) continue;
    const siblings = childrenByParent.get(unit.parentId) ?? [];
    siblings.push(unit.id);
    childrenByParent.set(unit.parentId, siblings);
  }

  const result = new Set<number>();
  function visit(id: number) {
    if (result.has(id)) return;
    result.add(id);
    for (const childId of childrenByParent.get(id) ?? []) {
      visit(childId);
    }
  }

  for (const id of selectedIds) visit(id);
  return result;
}
