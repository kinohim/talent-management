import { describe, expect, it } from "vitest";

import { EmploymentStatus } from "@/generated/prisma/client";

import { deriveAccountStatus, parseAccountFilters } from "./account-list";

describe("deriveAccountStatus", () => {
  it("退職済みなら未登録有無を問わず退職を返す", () => {
    expect(
      deriveAccountStatus({ isRegistered: false, employmentStatus: EmploymentStatus.RETIRED }),
    ).toBe("RETIRED");
    expect(
      deriveAccountStatus({ isRegistered: true, employmentStatus: EmploymentStatus.RETIRED }),
    ).toBe("RETIRED");
  });

  it("退職していなければisRegistered=falseで初回未登録", () => {
    expect(
      deriveAccountStatus({ isRegistered: false, employmentStatus: EmploymentStatus.ACTIVE }),
    ).toBe("UNREGISTERED");
  });

  it("退職しておらず登録済みなら在籍中", () => {
    expect(
      deriveAccountStatus({ isRegistered: true, employmentStatus: EmploymentStatus.ACTIVE }),
    ).toBe("ACTIVE");
  });
});

describe("parseAccountFilters", () => {
  it("空のsearchParamsは全項目デフォルト(空)になる", () => {
    expect(parseAccountFilters({})).toEqual({
      name: "",
      organizationUnitIds: [],
      roles: [],
      statuses: [],
    });
  });

  it("氏名は前後空白をtrimする", () => {
    expect(parseAccountFilters({ name: "  山田  " }).name).toBe("山田");
  });

  it("所属組織idは複数値を数値配列にパースする", () => {
    expect(parseAccountFilters({ orgUnitId: ["1", "2"] }).organizationUnitIds).toEqual([1, 2]);
  });

  it("単一値のsearchParamsも配列として扱う", () => {
    expect(parseAccountFilters({ orgUnitId: "3" }).organizationUnitIds).toEqual([3]);
  });

  it("不正な権限値は除外する", () => {
    expect(parseAccountFilters({ role: ["MANAGER", "INVALID"] }).roles).toEqual(["MANAGER"]);
  });

  it("不正な状態値は除外する", () => {
    expect(parseAccountFilters({ status: ["RETIRED", "INVALID"] }).statuses).toEqual(["RETIRED"]);
  });
});
