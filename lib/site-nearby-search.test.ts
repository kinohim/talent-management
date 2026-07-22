import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    site: { findUnique: vi.fn() },
    employee: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/heartrails", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/heartrails")>()),
  fetchStationGeo: vi.fn(),
}));

import { HeartRailsApiError, fetchStationGeo } from "@/lib/heartrails";
import { prisma } from "@/lib/prisma";

import { searchSiteNearbyEmployees } from "./site-nearby-search";

const findUniqueMock = vi.mocked(prisma.site.findUnique);
const findManyMock = vi.mocked(prisma.employee.findMany);
const fetchStationGeoMock = vi.mocked(fetchStationGeo);

const SITE = {
  id: 1,
  siteName: "A社基幹システム更改",
  nearestStationLine: "JR山手線",
  nearestStationName: "渋谷駅",
};

const SITE_GEO = { lat: 35.658, lng: 139.701, line: "JR山手線" };

function employee(overrides: Record<string, unknown>) {
  return {
    employeeId: "000001",
    name: "山田太郎",
    nearestStationLine: "JR山手線",
    nearestStationName: "渋谷駅",
    organizationUnit: { unitName: "開発部" },
    projects: [],
    employeeSkills: [],
    ...overrides,
  };
}

function geoTable(table: Record<string, { lat: number; lng: number } | null>) {
  const merged: Record<string, { lat: number; lng: number } | null> = {
    渋谷駅: { lat: SITE_GEO.lat, lng: SITE_GEO.lng },
    ...table,
  };
  fetchStationGeoMock.mockImplementation((name: string) =>
    Promise.resolve(name in merged ? (merged[name] ? { ...merged[name]!, line: "" } : null) : null),
  );
}

beforeEach(() => {
  findUniqueMock.mockReset();
  findManyMock.mockReset();
  fetchStationGeoMock.mockReset();
  findUniqueMock.mockResolvedValue(SITE as never);
});

describe("searchSiteNearbyEmployees", () => {
  it("半径内(近隣)の社員を距離とともに返す", async () => {
    findManyMock.mockResolvedValue([employee({})] as never);
    geoTable({ 渋谷駅: { lat: 35.658, lng: 139.701 } });

    const result = await searchSiteNearbyEmployees(1, 5);

    expect(result.employees).toHaveLength(1);
    expect(result.employees[0]).toMatchObject({
      employeeId: "000001",
      distanceKm: 0,
      matchedNearby: true,
    });
  });

  it("半径外でも現場と同一路線の社員は候補に含める", async () => {
    findManyMock.mockResolvedValue([
      employee({ employeeId: "000002", nearestStationName: "新宿駅" }),
    ] as never);
    geoTable({ 新宿駅: { lat: 36.658, lng: 139.701 } }); // 約111km離れている

    const result = await searchSiteNearbyEmployees(1, 5);

    expect(result.employees).toHaveLength(1);
    expect(result.employees[0]).toMatchObject({
      employeeId: "000002",
      matchedNearby: false,
      matchedSameLine: true,
    });
  });

  it("半径内であれば現場と路線が異なる社員も候補に含める(半径判定は路線に依存しない)", async () => {
    findManyMock.mockResolvedValue([
      employee({
        employeeId: "000003",
        nearestStationLine: "都営三田線",
        nearestStationName: "別駅A",
      }),
    ] as never);
    geoTable({ 別駅A: { lat: 35.659, lng: 139.702 } }); // 渋谷駅からごく近い

    const result = await searchSiteNearbyEmployees(1, 5);

    expect(result.employees).toHaveLength(1);
    expect(result.employees[0]).toMatchObject({
      employeeId: "000003",
      matchedNearby: true,
      matchedSameLine: false,
    });
  });

  it("現在参画中(project.endDate=null)の現場名を候補社員の情報に含める", async () => {
    findManyMock.mockResolvedValue([
      employee({ projects: [{ site: { siteName: "現在の現場" } }] }),
    ] as never);
    geoTable({ 渋谷駅: { lat: 35.658, lng: 139.701 } });

    const result = await searchSiteNearbyEmployees(1, 5);

    expect(result.employees[0].currentSiteName).toBe("現在の現場");
  });

  it("保有スキルは重複を除去して返す", async () => {
    findManyMock.mockResolvedValue([
      employee({
        employeeSkills: [{ skill: { skillName: "Java" } }, { skill: { skillName: "Java" } }],
      }),
    ] as never);
    geoTable({ 渋谷駅: { lat: 35.658, lng: 139.701 } });

    const result = await searchSiteNearbyEmployees(1, 5);

    expect(result.employees[0].skills).toEqual(["Java"]);
  });

  it("候補社員は現場からの距離が近い順にソートされる", async () => {
    findManyMock.mockResolvedValue([
      employee({ employeeId: "000002", nearestStationName: "新宿駅" }),
      employee({
        employeeId: "000003",
        nearestStationLine: "都営三田線",
        nearestStationName: "別駅A",
      }),
      employee({ employeeId: "000001" }),
    ] as never);
    geoTable({
      渋谷駅: { lat: 35.658, lng: 139.701 },
      新宿駅: { lat: 36.658, lng: 139.701 },
      別駅A: { lat: 35.659, lng: 139.702 },
    });

    const result = await searchSiteNearbyEmployees(1, 5);

    expect(result.employees.map((e) => e.employeeId)).toEqual(["000001", "000003", "000002"]);
  });

  it("半径内にも同一路線にも該当しない社員は候補から除外する", async () => {
    findManyMock.mockResolvedValue([
      employee({
        employeeId: "000004",
        nearestStationLine: "京王線",
        nearestStationName: "別駅B",
      }),
    ] as never);
    geoTable({ 別駅B: { lat: 40.0, lng: 140.0 } }); // 遠方かつ路線も異なる

    const result = await searchSiteNearbyEmployees(1, 5);

    expect(result.employees).toHaveLength(0);
  });

  it("退職済み(EmploymentStatus.RETIRED)の社員は候補から除外する", async () => {
    findManyMock.mockResolvedValue([] as never);
    geoTable({});

    await searchSiteNearbyEmployees(1, 5);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ employmentStatus: "ACTIVE" }),
      }),
    );
  });

  it("対象の現場が存在しない場合はsite: null・空配列を返す", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await searchSiteNearbyEmployees(999, 5);

    expect(result).toEqual({
      site: null,
      employees: [],
      unresolvedStationCount: 0,
      currentParticipants: [],
    });
  });

  it("現場に最寄駅が未設定の場合はsite: null・空配列を返す", async () => {
    findUniqueMock.mockResolvedValue({ ...SITE, nearestStationName: null } as never);

    const result = await searchSiteNearbyEmployees(1, 5);

    expect(result).toEqual({
      site: null,
      employees: [],
      unresolvedStationCount: 0,
      currentParticipants: [],
    });
  });

  it("現場の最寄駅の座標が解決できない場合はsite: null・空配列を返す", async () => {
    fetchStationGeoMock.mockResolvedValue(null);

    const result = await searchSiteNearbyEmployees(1, 5);

    expect(result).toEqual({
      site: null,
      employees: [],
      unresolvedStationCount: 0,
      currentParticipants: [],
    });
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("距離ちょうど半径(境界値)の社員は近隣に含める", async () => {
    findManyMock.mockResolvedValue([employee({})] as never);
    geoTable({ 渋谷駅: { lat: 35.658, lng: 139.701 } }); // 現場と同じ座標(距離0)

    const result = await searchSiteNearbyEmployees(1, 0);

    expect(result.employees[0].matchedNearby).toBe(true);
  });

  it("社員の最寄駅の座標が解決できない場合、unresolvedStationCountに計上し候補から除外する", async () => {
    findManyMock.mockResolvedValue([
      employee({ employeeId: "000005", nearestStationName: "未解決駅" }),
    ] as never);
    geoTable({ 未解決駅: null });

    const result = await searchSiteNearbyEmployees(1, 5);

    expect(result.employees).toHaveLength(0);
    expect(result.unresolvedStationCount).toBe(1);
  });

  it("同じ未解決駅に複数人住んでいる場合、unresolvedStationCountは駅数ではなく人数分カウントする", async () => {
    findManyMock.mockResolvedValue([
      employee({ employeeId: "000005", nearestStationName: "未解決駅" }),
      employee({ employeeId: "000006", nearestStationName: "未解決駅" }),
    ] as never);
    geoTable({ 未解決駅: null });

    const result = await searchSiteNearbyEmployees(1, 5);

    expect(result.unresolvedStationCount).toBe(2);
  });

  it("現在参画中(このsiteId・project.endDate=null)だが近隣にも同一路線にも一致しない社員を、候補社員一覧とは別にcurrentParticipantsとして返す", async () => {
    findManyMock.mockResolvedValue([
      employee({
        employeeId: "000007",
        name: "現在参画中社員",
        nearestStationLine: "京王線",
        nearestStationName: "別駅B",
        projects: [{ siteId: 1, site: { siteName: SITE.siteName } }],
      }),
    ] as never);
    geoTable({ 別駅B: { lat: 40.0, lng: 140.0 } }); // 遠方かつ路線も異なる

    const result = await searchSiteNearbyEmployees(1, 5);

    expect(result.employees).toHaveLength(0);
    expect(result.currentParticipants).toEqual([
      {
        employeeId: "000007",
        name: "現在参画中社員",
        organizationUnitName: "開発部",
        skills: [],
      },
    ]);
  });

  it("近隣または同一路線に一致し、かつ現在参画中の社員は、currentParticipantsには重複して含めない", async () => {
    findManyMock.mockResolvedValue([
      employee({ projects: [{ siteId: 1, site: { siteName: SITE.siteName } }] }),
    ] as never);
    geoTable({ 渋谷駅: { lat: 35.658, lng: 139.701 } });

    const result = await searchSiteNearbyEmployees(1, 5);

    expect(result.employees).toHaveLength(1);
    expect(result.currentParticipants).toEqual([]);
  });

  it("現在参画中でない社員はcurrentParticipantsに含めない", async () => {
    findManyMock.mockResolvedValue([
      employee({
        employeeId: "000008",
        nearestStationLine: "京王線",
        nearestStationName: "別駅B",
        projects: [{ siteId: 999, site: { siteName: "別の現場" } }],
      }),
    ] as never);
    geoTable({ 別駅B: { lat: 40.0, lng: 140.0 } });

    const result = await searchSiteNearbyEmployees(1, 5);

    expect(result.currentParticipants).toEqual([]);
  });

  it("現場の最寄駅の座標取得でHeartRailsApiErrorが発生した場合、座標未解決と同様にsite: nullを返す", async () => {
    fetchStationGeoMock.mockRejectedValue(
      new HeartRailsApiError("HeartRails Expressへの接続に失敗しました"),
    );

    const result = await searchSiteNearbyEmployees(1, 5);

    expect(result).toEqual({
      site: null,
      employees: [],
      unresolvedStationCount: 0,
      currentParticipants: [],
    });
  });

  it("社員の最寄駅の座標取得でHeartRailsApiErrorが発生した場合、その社員は座標未解決として扱い候補から除外する", async () => {
    findManyMock.mockResolvedValue([
      employee({ employeeId: "000009", nearestStationName: "エラー駅" }),
    ] as never);
    fetchStationGeoMock.mockImplementation((name: string) => {
      if (name === "渋谷駅") return Promise.resolve({ ...SITE_GEO });
      return Promise.reject(new HeartRailsApiError("HeartRails Expressがエラーを返しました"));
    });

    const result = await searchSiteNearbyEmployees(1, 5);

    expect(result.site).not.toBeNull();
    expect(result.employees).toHaveLength(0);
    expect(result.unresolvedStationCount).toBe(1);
  });

  it("HeartRailsApiError以外の例外が発生した場合は握りつぶさずそのまま再送出する", async () => {
    fetchStationGeoMock.mockRejectedValue(new TypeError("予期しないバグ"));

    await expect(searchSiteNearbyEmployees(1, 5)).rejects.toThrow(TypeError);
  });
});
