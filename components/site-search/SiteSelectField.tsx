"use client";

import { useState } from "react";

export type SiteOption = {
  id: number;
  siteName: string;
  nearestStationLine: string | null;
  nearestStationName: string | null;
};

type Props = {
  sites: SiteOption[];
  defaultSiteId: number | undefined;
};

function stationLabel(site: SiteOption | undefined): string {
  if (!site) return "-";
  if (!site.nearestStationName) return "未設定";
  return `${site.nearestStationLine ?? ""} ${site.nearestStationName}`.trim();
}

export function SiteSelectField({ sites, defaultSiteId }: Props) {
  const [selectedId, setSelectedId] = useState(defaultSiteId ?? sites[0]?.id);
  const selected = sites.find((s) => s.id === selectedId);

  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor="siteId" className="text-sm font-medium">
          現場
        </label>
        <select
          id="siteId"
          name="siteId"
          defaultValue={defaultSiteId}
          className="h-[42px] rounded border px-3 py-2"
          onChange={(e) => setSelectedId(Number(e.target.value))}
        >
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.siteName}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">現場最寄駅</span>
        <p className="flex h-[42px] items-center rounded border bg-background px-3 py-2 text-foreground/60">
          {stationLabel(selected)}
        </p>
      </div>
    </>
  );
}
