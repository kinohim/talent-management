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
