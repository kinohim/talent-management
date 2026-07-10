import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationUnit: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

import { UserRole } from "@/generated/prisma/client";

import type { OrganizationUnitOption } from "./organization-unit";
import {
  canViewEmployeeResume,
  formatOrganizationUnitPath,
  isWithinResumeViewScope,
  resolveOrganizationUnitId,
  resolveSelectionFromLeaf,
} from "./organization-unit";

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

const viewScopeUnits: OrganizationUnitOption[] = [
  { id: 1, parentId: null, unitName: "システム事業部", unitLevel: "DIVISION" },
  { id: 2, parentId: 1, unitName: "開発部", unitLevel: "DEPARTMENT" },
  { id: 3, parentId: 2, unitName: "第一Gr", unitLevel: "GROUP" },
  { id: 4, parentId: 2, unitName: "第二Gr", unitLevel: "GROUP" },
  { id: 5, parentId: 1, unitName: "品質保証部", unitLevel: "DEPARTMENT" },
  { id: 6, parentId: null, unitName: "営業事業部", unitLevel: "DIVISION" },
  { id: 7, parentId: 6, unitName: "第一営業部", unitLevel: "DEPARTMENT" },
];

describe("isWithinResumeViewScope", () => {
  it("片方または双方が未所属(NULL)ならfalse", () => {
    expect(isWithinResumeViewScope(viewScopeUnits, null, 3)).toBe(false);
    expect(isWithinResumeViewScope(viewScopeUnits, 3, null)).toBe(false);
    expect(isWithinResumeViewScope(viewScopeUnits, null, null)).toBe(false);
  });

  it("同じGrならtrue", () => {
    expect(isWithinResumeViewScope(viewScopeUnits, 3, 3)).toBe(true);
  });

  it("同じ部署配下の別Grならtrue(部署一致で判定)", () => {
    expect(isWithinResumeViewScope(viewScopeUnits, 3, 4)).toBe(true);
  });

  it("同じ事業部の別部署ならfalse(部署が不一致)", () => {
    expect(isWithinResumeViewScope(viewScopeUnits, 3, 5)).toBe(false);
  });

  it("事業部直下同士・同一事業部ならtrue", () => {
    expect(isWithinResumeViewScope(viewScopeUnits, 1, 1)).toBe(true);
  });

  it("事業部直下と、同一事業部内の部署所属者は双方向でtrue", () => {
    expect(isWithinResumeViewScope(viewScopeUnits, 1, 3)).toBe(true);
    expect(isWithinResumeViewScope(viewScopeUnits, 3, 1)).toBe(true);
  });

  it("事業部直下と、別事業部の部署所属者はfalse", () => {
    expect(isWithinResumeViewScope(viewScopeUnits, 1, 7)).toBe(false);
  });

  it("事業部直下同士・別事業部ならfalse", () => {
    expect(isWithinResumeViewScope(viewScopeUnits, 1, 6)).toBe(false);
  });
});

describe("canViewEmployeeResume", () => {
  it("isSelfならroleや所属に関係なくtrue", () => {
    expect(
      canViewEmployeeResume({
        viewerRole: UserRole.EMPLOYEE,
        isSelf: true,
        units: viewScopeUnits,
        viewerOrganizationUnitId: null,
        targetOrganizationUnitId: null,
      }),
    ).toBe(true);
  });

  it("HR_SALESは閲覧範囲外の相手でもtrue", () => {
    expect(
      canViewEmployeeResume({
        viewerRole: UserRole.HR_SALES,
        isSelf: false,
        units: viewScopeUnits,
        viewerOrganizationUnitId: null,
        targetOrganizationUnitId: 5,
      }),
    ).toBe(true);
  });

  it("MANAGERは閲覧範囲外の相手でもtrue", () => {
    expect(
      canViewEmployeeResume({
        viewerRole: UserRole.MANAGER,
        isSelf: false,
        units: viewScopeUnits,
        viewerOrganizationUnitId: 7,
        targetOrganizationUnitId: 3,
      }),
    ).toBe(true);
  });

  it("EMPLOYEEは閲覧範囲判定に従う(範囲外はfalse)", () => {
    expect(
      canViewEmployeeResume({
        viewerRole: UserRole.EMPLOYEE,
        isSelf: false,
        units: viewScopeUnits,
        viewerOrganizationUnitId: 3,
        targetOrganizationUnitId: 7,
      }),
    ).toBe(false);
  });

  it("EMPLOYEEでも閲覧範囲内ならtrue", () => {
    expect(
      canViewEmployeeResume({
        viewerRole: UserRole.EMPLOYEE,
        isSelf: false,
        units: viewScopeUnits,
        viewerOrganizationUnitId: 3,
        targetOrganizationUnitId: 4,
      }),
    ).toBe(true);
  });
});

describe("formatOrganizationUnitPath", () => {
  it("nullなら未所属", () => {
    expect(formatOrganizationUnitPath(null)).toBe("未所属");
  });

  it("Grまで辿った場合は事業部/部署/Grを連結する", () => {
    expect(
      formatOrganizationUnitPath({
        unitName: "第一Gr",
        parent: {
          unitName: "開発部",
          parent: { unitName: "システム事業部", parent: null },
        },
      }),
    ).toBe("システム事業部 / 開発部 / 第一Gr");
  });

  it("事業部直下のみなら事業部名だけを返す", () => {
    expect(
      formatOrganizationUnitPath({ unitName: "システム事業部", parent: null }),
    ).toBe("システム事業部");
  });
});
