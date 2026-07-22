"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    google?: { maps: typeof google.maps };
  }
}

// Googleは地図描画のみに使う(経路計算は行わない。docs/decisions.md参照)。
export type SiteNearbyEmployeeView = {
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

export type SiteCurrentParticipantView = {
  employeeId: string;
  name: string | null;
  organizationUnitName: string | null;
  skills: string[];
};

export type SiteNearbyInfo = {
  id: number;
  name: string;
  stationLabel: string;
  lat: number;
  lng: number;
};

type Props = {
  site: SiteNearbyInfo;
  employees: SiteNearbyEmployeeView[];
  currentParticipants: SiteCurrentParticipantView[];
  radiusKm: number;
};

let scriptLoadPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Mapsの読み込みに失敗しました"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

function badgeLabel(e: SiteNearbyEmployeeView): string {
  if (e.matchedNearby && e.matchedSameLine) return "近隣・同一路線";
  if (e.matchedNearby) return "近隣";
  return "同一路線";
}

// 近隣=青、同一路線=緑、両方一致=青緑のグラデーション(地図凡例の色分けと揃える)
function badgeClassName(e: SiteNearbyEmployeeView): string {
  if (e.matchedNearby && e.matchedSameLine) return "bg-gradient-to-r from-blue-500 to-green-500";
  return e.matchedNearby ? "bg-blue-500" : "bg-green-500";
}

// 地図凡例のバッジ色と揃えたピン型マーカー(近隣=青、同一路線=緑)。
// ピンの頭(先端の真上)に顔アイコンを乗せて、地図上で社員のピンだと
// 一目で分かるようにする
function personMarkerIcon(color: string): google.maps.Icon {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">' +
    `<path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="${color}" stroke="white" stroke-width="1.5"/>` +
    '<circle cx="16" cy="15" r="9" fill="white"/>' +
    `<circle cx="12.5" cy="13" r="1.6" fill="${color}"/>` +
    `<circle cx="19.5" cy="13" r="1.6" fill="${color}"/>` +
    `<path d="M11 17.5c1.2 2 2.9 3 5 3s3.8-1 5-3" stroke="${color}" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
    "</svg>";
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google!.maps.Size(32, 40),
    anchor: new window.google!.maps.Point(16, 40),
  };
}

const PIN_OFFSET_DEG = 0.0015; // 緯度1度は約111kmのため、約170m相当のずらし幅

// 同じ最寄り駅の社員は座標が完全に一致しピンが重なって見えなくなるため、
// 同一座標のグループごとに円状へ少しずつずらした表示用座標を求める
function spreadOverlappingPins(
  employees: SiteNearbyEmployeeView[],
): Map<string, { lat: number; lng: number }> {
  const positions = new Map<string, { lat: number; lng: number }>();
  const groups = new Map<string, SiteNearbyEmployeeView[]>();
  for (const emp of employees) {
    const key = `${emp.lat.toFixed(5)},${emp.lng.toFixed(5)}`;
    const group = groups.get(key);
    if (group) group.push(emp);
    else groups.set(key, [emp]);
  }

  for (const group of groups.values()) {
    group.forEach((emp, index) => {
      if (group.length === 1) {
        positions.set(emp.employeeId, { lat: emp.lat, lng: emp.lng });
        return;
      }
      const angle = (2 * Math.PI * index) / group.length;
      const latOffset = PIN_OFFSET_DEG * Math.sin(angle);
      const lngOffset = (PIN_OFFSET_DEG * Math.cos(angle)) / Math.cos((emp.lat * Math.PI) / 180);
      positions.set(emp.employeeId, { lat: emp.lat + latOffset, lng: emp.lng + lngOffset });
    });
  }
  return positions;
}

export function SiteNearbyMap({ site, employees, currentParticipants, radiusKm }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pinPositions = useMemo(() => spreadOverlappingPins(employees), [employees]);

  useEffect(() => {
    // 呼び出し元(site-search/page.tsx)がisGoogleMapsEnabledで未設定時は
    // このコンポーネント自体を描画しないため、ここでは必ず設定済みの前提でよい
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

    let cancelled = false;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !mapDivRef.current || !window.google) return;

        const map = new window.google.maps.Map(mapDivRef.current, {
          center: { lat: site.lat, lng: site.lng },
          zoom: 12,
        });
        mapRef.current = map;

        new window.google.maps.Marker({
          position: { lat: site.lat, lng: site.lng },
          map,
          title: `現場: ${site.name}(${site.stationLabel})`,
          icon: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
        });

        for (const emp of employees) {
          const position = pinPositions.get(emp.employeeId) ?? { lat: emp.lat, lng: emp.lng };
          new window.google.maps.Marker({
            position,
            map,
            title: `${emp.name ?? ""}(${badgeLabel(emp)})`,
            icon: personMarkerIcon(emp.matchedNearby ? "#3b82f6" : "#22c55e"),
          });
        }
      })
      .catch((err: Error) => setError(err.message));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site.id, site.lat, site.lng]);

  const focusEmployee = (emp: SiteNearbyEmployeeView) => {
    const map = mapRef.current;
    if (!map) return;
    map.panTo(pinPositions.get(emp.employeeId) ?? { lat: emp.lat, lng: emp.lng });
    map.setZoom(15);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[45%_55%]">
      <div className="rounded-2xl border border-surface-border bg-surface px-6 py-5">
        <h2 className="mb-3 font-semibold text-brand">最寄駅マップ</h2>
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <div
            ref={mapDivRef}
            className="h-[500px] w-full rounded-2xl border border-surface-border bg-background"
          />
        )}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-foreground/60">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
            現場最寄り駅
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
            周辺に住む社員の最寄り駅
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
            同一路線に住む社員の最寄り駅
          </span>
        </div>
      </div>

      <div className="max-h-[600px] space-y-3 overflow-auto rounded-2xl border border-surface-border bg-surface px-6 py-5">
        {currentParticipants.length > 0 && (
          <div className="mb-4 border-b border-surface-border pb-3">
            <h3 className="text-xs font-semibold text-foreground/50">現在参画中の社員</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {currentParticipants.map((p) => (
                <li
                  key={p.employeeId}
                  className="flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs text-foreground/60"
                  title={p.skills.join(" / ")}
                >
                  <span>
                    {p.name}
                    {p.organizationUnitName ? `(${p.organizationUnitName})` : ""}
                  </span>
                  <Link
                    href={`/resumes/${p.employeeId}`}
                    className="rounded-full border border-surface-border px-2 py-0.5 hover:bg-primary/10"
                  >
                    経歴書
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <h2 className="font-semibold text-brand">
          検索結果({employees.length}件・{radiusKm}km圏内 または 同一路線)
        </h2>
        <p className="text-xs text-foreground/50">
          「近隣とみなす範囲」は同一路線の社員には影響しません(同一路線なら乗換なしのため、距離に関わらず常に表示されます)。
        </p>
        {employees.length === 0 && (
          <p className="text-sm text-foreground/50">該当する社員がいません</p>
        )}
        {employees.map((emp) => (
          <div key={emp.employeeId} className="rounded-2xl border border-surface-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <h3 className="font-semibold text-brand">{emp.name}</h3>
                <Link
                  href={`/resumes/${emp.employeeId}`}
                  className="rounded-full border border-surface-border px-2 py-0.5 text-xs hover:bg-primary/10"
                >
                  経歴書
                </Link>
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium text-white ${badgeClassName(emp)}`}
              >
                {badgeLabel(emp)}
              </span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <th className="w-24 py-1 text-left text-foreground/50">所属</th>
                  <td>{emp.organizationUnitName ?? "-"}</td>
                </tr>
                <tr>
                  <th className="py-1 text-left text-foreground/50">現在参画中</th>
                  <td>{emp.currentSiteName ?? "-"}</td>
                </tr>
                <tr>
                  <th className="py-1 text-left text-foreground/50">最寄駅</th>
                  <td>
                    {emp.nearestStationLine} {emp.nearestStationName}
                  </td>
                </tr>
                <tr>
                  <th className="py-1 text-left text-foreground/50">距離</th>
                  <td>約{emp.distanceKm}km</td>
                </tr>
                {emp.skills.length > 0 && (
                  <tr>
                    <th className="py-1 text-left text-foreground/50">スキル</th>
                    <td>{emp.skills.join(" / ")}</td>
                  </tr>
                )}
              </tbody>
            </table>
            <button
              type="button"
              onClick={() => focusEmployee(emp)}
              className="mt-2 rounded-full border border-surface-border px-3 py-1 text-xs hover:bg-primary/10"
            >
              地図で見る
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
