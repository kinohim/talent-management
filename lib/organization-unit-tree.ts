import type { OrganizationUnitLevel } from "@/generated/prisma/client";
import type { OrganizationUnitOption } from "@/lib/organization-unit";

// このファイルはUserRole/prismaの値importを一切持たない(型のみ)。
// クライアントコンポーネント(OrganizationUnitNodeItem等)から直接importされる
// ため、prismaランタイムを巻き込まないよう`lib/organization-unit.ts`とは
// 分離している。

export type OrganizationUnitNode = OrganizationUnitOption & {
  children: OrganizationUnitNode[];
};

// master-org-units(部署マスタ管理)の階層インデント表示用。フラットな一覧を
// parentIdでグルーピングし、事業部>部署>Grのツリーに組み立てる。
// 各階層内はunitNameの昇順。
// rootIdsを指定すると、そのidの集合をツリーの根として探索を開始する(親が
// null以外でも根として扱える)。resume-listで一般社員の閲覧範囲に絞ったunitsを
// 渡す場合、根となる部署の親(事業部)はunitsに含まれずparentIdがnullでも
// ないため、rootIdsを渡さないとbuild(null)が何も見つけられず空のツリーに
// なってしまう。
export function buildOrganizationUnitTree(
  units: OrganizationUnitOption[],
  rootIds?: number[] | null,
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

  if (rootIds) {
    const unitById = new Map(units.map((unit) => [unit.id, unit]));
    return rootIds
      .map((id) => unitById.get(id))
      .filter((unit): unit is OrganizationUnitOption => unit != null)
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

// account-list(アカウント一覧)の所属組織フィルタ用。選択された組織単位idに、
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

// カスケード式の組織フィルタ(上位を選択して初めて下位が選択できるUI)用の
// 検索対象解決。親と子の両方が選択されている場合、親側の全展開をやめて
// 「選択された最深ノード」の配下のみを対象にする(例: 事業部A✓+部署A1✓なら
// A1配下のみ。A直下の他部署は対象外)。チェック済み子孫を一つも持たない選択
// ノードは従来どおり配下すべてを対象に展開する(親のみ選択=配下全部の互換)。
export function resolveEffectiveOrgUnitIds(
  units: OrganizationUnitOption[],
  selectedIds: number[],
): Set<number> {
  const selected = new Set(selectedIds);
  const childrenByParent = new Map<number, number[]>();
  for (const unit of units) {
    if (unit.parentId == null) continue;
    const siblings = childrenByParent.get(unit.parentId) ?? [];
    siblings.push(unit.id);
    childrenByParent.set(unit.parentId, siblings);
  }

  // idの配下(自身除く)に選択済みノードがあるか
  function hasSelectedDescendant(id: number): boolean {
    for (const childId of childrenByParent.get(id) ?? []) {
      if (selected.has(childId) || hasSelectedDescendant(childId)) return true;
    }
    return false;
  }

  const effectiveRoots = selectedIds.filter((id) => !hasSelectedDescendant(id));
  return collectDescendantIds(units, effectiveRoots);
}
