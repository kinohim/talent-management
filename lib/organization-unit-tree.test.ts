import { describe, expect, it } from "vitest";

import type { OrganizationUnitOption } from "./organization-unit";
import {
  buildOrganizationUnitTree,
  collectDescendantIds,
  deriveChildLevel,
} from "./organization-unit-tree";

const units: OrganizationUnitOption[] = [
  { id: 1, parentId: null, unitName: "システム事業部", unitLevel: "DIVISION" },
  { id: 2, parentId: 1, unitName: "開発部", unitLevel: "DEPARTMENT" },
  { id: 3, parentId: 2, unitName: "第一Gr", unitLevel: "GROUP" },
  { id: 4, parentId: 2, unitName: "第二Gr", unitLevel: "GROUP" },
  { id: 5, parentId: 1, unitName: "品質保証部", unitLevel: "DEPARTMENT" },
  { id: 6, parentId: null, unitName: "営業事業部", unitLevel: "DIVISION" },
  { id: 7, parentId: 6, unitName: "第一営業部", unitLevel: "DEPARTMENT" },
];

describe("buildOrganizationUnitTree", () => {
  it("parentIdでグルーピングし、事業部>部署>Grのツリーを組み立てる(各階層unitName昇順)", () => {
    const tree = buildOrganizationUnitTree(units);

    expect(tree.map((n) => n.unitName)).toEqual(["システム事業部", "営業事業部"]);

    const system = tree.find((n) => n.unitName === "システム事業部")!;
    expect(system.children.map((n) => n.unitName)).toEqual(["開発部", "品質保証部"]);

    const dev = system.children.find((n) => n.unitName === "開発部")!;
    expect(dev.children.map((n) => n.unitName)).toEqual(["第一Gr", "第二Gr"]);

    const sales = tree.find((n) => n.unitName === "営業事業部")!;
    expect(sales.children.map((n) => n.unitName)).toEqual(["第一営業部"]);
    expect(sales.children[0].children).toEqual([]);
  });

  it("空配列を渡すと空のツリーを返す", () => {
    expect(buildOrganizationUnitTree([])).toEqual([]);
  });
});

describe("deriveChildLevel", () => {
  it("nullなら新規事業部としてDIVISIONを返す", () => {
    expect(deriveChildLevel(null)).toBe("DIVISION");
  });

  it("DIVISIONの配下はDEPARTMENT", () => {
    expect(deriveChildLevel("DIVISION")).toBe("DEPARTMENT");
  });

  it("DEPARTMENTの配下はGROUP", () => {
    expect(deriveChildLevel("DEPARTMENT")).toBe("GROUP");
  });

  it("GROUPの配下は存在しないためnull", () => {
    expect(deriveChildLevel("GROUP")).toBeNull();
  });
});

describe("collectDescendantIds", () => {
  it("事業部を選ぶと配下の部署・Grもすべて含まれる", () => {
    const ids = collectDescendantIds(units, [1]);
    expect(ids).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it("部署を選ぶとその配下のGrのみ含まれる(兄弟部署は含まない)", () => {
    const ids = collectDescendantIds(units, [2]);
    expect(ids).toEqual(new Set([2, 3, 4]));
  });

  it("Grを選ぶとそれ自身のみ(配下が無いため)", () => {
    const ids = collectDescendantIds(units, [3]);
    expect(ids).toEqual(new Set([3]));
  });

  it("複数選択時はそれぞれの配下を合算する(重複除去)", () => {
    const ids = collectDescendantIds(units, [2, 6]);
    expect(ids).toEqual(new Set([2, 3, 4, 6, 7]));
  });

  it("空配列を渡すと空集合を返す", () => {
    expect(collectDescendantIds(units, [])).toEqual(new Set());
  });
});
