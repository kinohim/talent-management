import { describe, expect, it } from "vitest";

import { EmploymentStatus } from "@/generated/prisma/client";

import {
  buildAccountOrderBy,
  buildAccountStatusWhere,
  deriveAccountStatus,
  parseAccountFilters,
  type AccountStatus,
} from "./account-list";

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
      colName: "",
      colEmail: "",
      colOrganizationUnitIds: [],
      colRoles: [],
      colStatuses: [],
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

  it("列フィルタをパースする(テキストはtrim、所属組織は\"none\"許容)", () => {
    const filters = parseAccountFilters({
      colName: " 佐藤 ",
      colEmail: " sato@example.com ",
      colOrg: ["2", "none", "x"],
      colRole: ["EMPLOYEE", "INVALID"],
      colStatus: ["ACTIVE", "INVALID"],
    });
    expect(filters.colName).toBe("佐藤");
    expect(filters.colEmail).toBe("sato@example.com");
    expect(filters.colOrganizationUnitIds).toEqual([2, "none"]);
    expect(filters.colRoles).toEqual(["EMPLOYEE"]);
    expect(filters.colStatuses).toEqual(["ACTIVE"]);
  });
});

describe("buildAccountStatusWhere", () => {
  it("空配列はnull(絞込なし)", () => {
    expect(buildAccountStatusWhere([])).toBeNull();
  });

  it("単一状態は単一条件を返す", () => {
    expect(buildAccountStatusWhere(["RETIRED"])).toEqual({
      employmentStatus: EmploymentStatus.RETIRED,
    });
    expect(buildAccountStatusWhere(["UNREGISTERED"])).toEqual({
      employmentStatus: EmploymentStatus.ACTIVE,
      isRegistered: false,
    });
    expect(buildAccountStatusWhere(["ACTIVE"])).toEqual({
      employmentStatus: EmploymentStatus.ACTIVE,
      isRegistered: true,
    });
  });

  it("複数状態はOR合成する", () => {
    expect(buildAccountStatusWhere(["ACTIVE", "RETIRED"])).toEqual({
      OR: [
        { employmentStatus: EmploymentStatus.ACTIVE, isRegistered: true },
        { employmentStatus: EmploymentStatus.RETIRED },
      ],
    });
  });

  it("whereの判定はderiveAccountStatusと整合する(全4通りの社員状態で検証)", () => {
    const employees = [
      { isRegistered: true, employmentStatus: EmploymentStatus.ACTIVE },
      { isRegistered: false, employmentStatus: EmploymentStatus.ACTIVE },
      { isRegistered: true, employmentStatus: EmploymentStatus.RETIRED },
      { isRegistered: false, employmentStatus: EmploymentStatus.RETIRED },
    ];
    // whereと同じ判定をJSで再現する簡易マッチャ
    const matches = (
      employee: (typeof employees)[number],
      status: AccountStatus,
    ): boolean => {
      switch (status) {
        case "RETIRED":
          return employee.employmentStatus === EmploymentStatus.RETIRED;
        case "UNREGISTERED":
          return (
            employee.employmentStatus === EmploymentStatus.ACTIVE &&
            !employee.isRegistered
          );
        case "ACTIVE":
          return (
            employee.employmentStatus === EmploymentStatus.ACTIVE &&
            employee.isRegistered
          );
      }
    };
    for (const employee of employees) {
      const derived = deriveAccountStatus(employee);
      for (const status of ["ACTIVE", "UNREGISTERED", "RETIRED"] as const) {
        expect(matches(employee, status)).toBe(derived === status);
      }
    }
  });
});

describe("buildAccountOrderBy", () => {
  it("null(デフォルト)は氏名昇順+employeeIdタイブレーク", () => {
    expect(buildAccountOrderBy(null, "desc")).toEqual([
      { name: { sort: "asc", nulls: "last" } },
      { employeeId: "asc" },
    ]);
  });

  it("email/role/lastLoginはuserリレーション経由でソートする", () => {
    expect(buildAccountOrderBy("email", "desc")).toEqual([
      { user: { email: "desc" } },
      { employeeId: "asc" },
    ]);
    expect(buildAccountOrderBy("role", "asc")).toEqual([
      { user: { role: "asc" } },
      { employeeId: "asc" },
    ]);
    expect(buildAccountOrderBy("lastLogin", "desc")).toEqual([
      { user: { lastLoginAt: { sort: "desc", nulls: "last" } } },
      { employeeId: "asc" },
    ]);
  });

  it("statusはemploymentStatus+isRegisteredの組でソートする", () => {
    expect(buildAccountOrderBy("status", "asc")).toEqual([
      { employmentStatus: "asc" },
      { isRegistered: "asc" },
      { employeeId: "asc" },
    ]);
  });

  it("orgは組織名でソートする", () => {
    expect(buildAccountOrderBy("org", "asc")).toEqual([
      { organizationUnit: { unitName: "asc" } },
      { employeeId: "asc" },
    ]);
  });
});

describe("buildAccountOrderBy lastLoginのnull", () => {
  it("未ログイン(-)は昇順・降順のどちらでも末尾に置く", () => {
    expect(buildAccountOrderBy("lastLogin", "asc")).toEqual([
      { user: { lastLoginAt: { sort: "asc", nulls: "last" } } },
      { employeeId: "asc" },
    ]);
  });
});
