import { EmploymentStatus } from "@/generated/prisma/client";
import { HeartRailsApiError, fetchStationGeo, type StationGeo } from "@/lib/heartrails";
import { prisma } from "@/lib/prisma";

export type SiteNearbyEmployee = {
  employeeId: string;
  name: string | null;
  organizationUnitName: string | null;
  currentSiteName: string | null;
  nearestStationLine: string;
  nearestStationName: string;
  skills: string[];
  lat: number;
  lng: number;
  distanceKm: number;
  matchedNearby: boolean;
  matchedSameLine: boolean;
};

// 選択した現場に現在参画中の社員(近隣・同一路線の一致条件に関わらず検索結果より上に別枠表示用)
export type SiteCurrentParticipant = {
  employeeId: string;
  name: string | null;
  organizationUnitName: string | null;
  skills: string[];
};

export type SiteNearbyResult = {
  site: { id: number; name: string; stationLabel: string; lat: number; lng: number } | null;
  employees: SiteNearbyEmployee[];
  currentParticipants: SiteCurrentParticipant[];
  unresolvedStationCount: number;
};

const EARTH_RADIUS_KM = 6371;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, h)));
}

function stationKey(line: string | null, name: string): string {
  return `${line ?? ""}|${name}`;
}

// HeartRails Express APIが一時的に利用できない場合も検索自体は継続する
// (座標未解決の駅と同様に扱い、その社員・現場だけを候補から外す)
async function resolveStationGeo(name: string, lineHint: string | undefined): Promise<StationGeo | null> {
  try {
    return await fetchStationGeo(name, lineHint);
  } catch (err) {
    if (err instanceof HeartRailsApiError) return null;
    throw err;
  }
}

const EMPTY_RESULT: SiteNearbyResult = {
  site: null,
  employees: [],
  currentParticipants: [],
  unresolvedStationCount: 0,
};

export async function searchSiteNearbyEmployees(
  siteId: number,
  radiusKm: number,
): Promise<SiteNearbyResult> {
  const site = await prisma.site.findUnique({
    where: { id: siteId, deletedAt: null },
    select: { id: true, siteName: true, nearestStationLine: true, nearestStationName: true },
  });
  if (!site || !site.nearestStationName) {
    return EMPTY_RESULT;
  }

  const siteGeo = await resolveStationGeo(site.nearestStationName, site.nearestStationLine ?? undefined);
  if (!siteGeo) {
    return EMPTY_RESULT;
  }

  const employees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      employmentStatus: EmploymentStatus.ACTIVE,
    },
    select: {
      employeeId: true,
      name: true,
      nearestStationLine: true,
      nearestStationName: true,
      organizationUnit: { select: { unitName: true } },
      projects: {
        where: { deletedAt: null, endDate: null },
        orderBy: { startDate: "desc" },
        select: { siteId: true, site: { select: { siteName: true } } },
      },
      employeeSkills: {
        where: { deletedAt: null },
        select: { skill: { select: { skillName: true } } },
      },
    },
  });

  // 最寄駅文字列ごとに1回だけ座標解決する(同じ駅に住む社員が多いため呼び出し回数を削減)
  const distinctStations = new Map<string, { line: string | null; name: string }>();
  for (const e of employees) {
    if (!e.nearestStationName) continue;
    const key = stationKey(e.nearestStationLine, e.nearestStationName);
    if (!distinctStations.has(key)) {
      distinctStations.set(key, { line: e.nearestStationLine, name: e.nearestStationName });
    }
  }

  const geoByKey = new Map<string, StationGeo | null>();
  await Promise.all(
    Array.from(distinctStations.entries()).map(async ([key, station]) => {
      geoByKey.set(key, await resolveStationGeo(station.name, station.line ?? undefined));
    }),
  );

  const results: SiteNearbyEmployee[] = [];
  let unresolvedStationCount = 0;

  for (const e of employees) {
    if (!e.nearestStationName) continue;
    const geo = geoByKey.get(stationKey(e.nearestStationLine, e.nearestStationName));
    if (!geo) {
      unresolvedStationCount++;
      continue;
    }

    const distanceKm = haversineKm(siteGeo, geo);
    const matchedNearby = distanceKm <= radiusKm;
    const matchedSameLine = !!e.nearestStationLine && e.nearestStationLine === site.nearestStationLine;
    if (!matchedNearby && !matchedSameLine) continue;

    results.push({
      employeeId: e.employeeId,
      name: e.name,
      organizationUnitName: e.organizationUnit?.unitName ?? null,
      currentSiteName: e.projects[0]?.site.siteName ?? null,
      nearestStationLine: e.nearestStationLine ?? "",
      nearestStationName: e.nearestStationName,
      skills: [...new Set(e.employeeSkills.map((l) => l.skill.skillName))],
      lat: geo.lat,
      lng: geo.lng,
      distanceKm: Math.round(distanceKm * 10) / 10,
      matchedNearby,
      matchedSameLine,
    });
  }

  results.sort((a, b) => a.distanceKm - b.distanceKm);

  // 選択した現場に現在参画中の社員は、近隣・同一路線の一致条件に関わらず別枠でも返す
  // (候補社員一覧に表示中でも、この別枠には重ねて含める)
  const currentParticipants: SiteCurrentParticipant[] = [];
  for (const e of employees) {
    if (!e.projects.some((p) => p.siteId === site.id)) continue;
    currentParticipants.push({
      employeeId: e.employeeId,
      name: e.name,
      organizationUnitName: e.organizationUnit?.unitName ?? null,
      skills: [...new Set(e.employeeSkills.map((l) => l.skill.skillName))],
    });
  }

  return {
    site: {
      id: site.id,
      name: site.siteName,
      stationLabel: `${site.nearestStationLine ?? ""} ${site.nearestStationName}`.trim(),
      lat: siteGeo.lat,
      lng: siteGeo.lng,
    },
    employees: results,
    currentParticipants,
    unresolvedStationCount,
  };
}
