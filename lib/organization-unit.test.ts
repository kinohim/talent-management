import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationUnit: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

import type { OrganizationUnitOption } from "./organization-unit";
import { resolveOrganizationUnitId, resolveSelectionFromLeaf } from "./organization-unit";

const findFirstMock = vi.mocked(prisma.organizationUnit.findFirst);

const units: OrganizationUnitOption[] = [
  { id: 1, parentId: null, unitName: "システム事業部", unitLevel: "DIVISION" },
  { id: 2, parentId: 1, unitName: "開発部", unitLevel: "DEPARTMENT" },
  { id: 3, parentId: 2, unitName: "第一Gr", unitLevel: "GROUP" },
];

describe("resolveSelectionFromLeaf", () => {
  it("leafIdがnullなら全てnull", () => {
    expect(resolveSelectionFromLeaf(units, null)).toEqual({
      divisionId: null,
      departmentId: null,
      groupId: null,
    });
  });

  it("Gr選択時は事業部/部署/Grすべて解決される", () => {
    expect(resolveSelectionFromLeaf(units, 3)).toEqual({
      divisionId: 1,
      departmentId: 2,
      groupId: 3,
    });
  });

  it("部署までの選択時はgroupIdはnull", () => {
    expect(resolveSelectionFromLeaf(units, 2)).toEqual({
      divisionId: 1,
      departmentId: 2,
      groupId: null,
    });
  });

  it("事業部のみの選択時はdepartmentId/groupIdはnull", () => {
    expect(resolveSelectionFromLeaf(units, 1)).toEqual({
      divisionId: 1,
      departmentId: null,
      groupId: null,
    });
  });
});

describe("resolveOrganizationUnitId", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("Gr>部署>事業部の優先順位で最下層を採用する", async () => {
    findFirstMock.mockResolvedValue({ id: 3 } as never);
    const result = await resolveOrganizationUnitId({
      divisionId: "1",
      departmentId: "2",
      groupId: "3",
    });
    expect(result).toBe(3);
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: 3, deletedAt: null },
      select: { id: true },
    });
  });

  it("groupId未選択ならdepartmentIdを採用する", async () => {
    findFirstMock.mockResolvedValue({ id: 2 } as never);
    const result = await resolveOrganizationUnitId({
      divisionId: "1",
      departmentId: "2",
    });
    expect(result).toBe(2);
  });

  it("何も選択されていなければnullを返す(DBを問い合わせない)", async () => {
    const result = await resolveOrganizationUnitId({});
    expect(result).toBeNull();
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("存在しない/削除済みidならnullを返す", async () => {
    findFirstMock.mockResolvedValue(null);
    const result = await resolveOrganizationUnitId({ divisionId: "999" });
    expect(result).toBeNull();
  });
});
