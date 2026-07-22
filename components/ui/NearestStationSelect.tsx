"use client";

import { useState } from "react";

import { PREFECTURES } from "@/lib/prefectures";

export function NearestStationSelect({
  namePrefecture,
  nameLine,
  nameName,
  defaultPrefecture,
  defaultLine,
  defaultName,
}: {
  namePrefecture: string;
  nameLine: string;
  nameName: string;
  defaultPrefecture: string | null;
  defaultLine: string | null;
  defaultName: string | null;
}) {
  const [prefecture, setPrefecture] = useState(defaultPrefecture ?? "");
  const [line, setLine] = useState(defaultLine ?? "");
  const [station, setStation] = useState(defaultName ?? "");
  const [lines, setLines] = useState<string[]>(defaultLine ? [defaultLine] : []);
  const [stations, setStations] = useState<string[]>(defaultName ? [defaultName] : []);
  const [error, setError] = useState<string | null>(null);

  async function handlePrefectureChange(value: string) {
    setPrefecture(value);
    setLine("");
    setStation("");
    setLines([]);
    setStations([]);
    setError(null);
    if (!value) return;
    try {
      const res = await fetch(`/api/railways?prefecture=${encodeURIComponent(value)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLines(data.items ?? []);
    } catch {
      setError("路線一覧の取得に失敗しました");
    }
  }

  async function handleLineChange(value: string) {
    setLine(value);
    setStation("");
    setStations([]);
    setError(null);
    if (!value) return;
    try {
      const res = await fetch(`/api/stations?line=${encodeURIComponent(value)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStations(data.items ?? []);
    } catch {
      setError("駅一覧の取得に失敗しました");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={`${nameName}-prefecture`} className="text-sm font-medium">
            都道府県
          </label>
          <select
            id={`${nameName}-prefecture`}
            name={namePrefecture}
            value={prefecture}
            onChange={(e) => handlePrefectureChange(e.target.value)}
            className="h-[42px] w-40 rounded border px-3 py-2"
          >
            <option value="">都道府県を選択</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={`${nameName}-line`} className="text-sm font-medium">
            路線
          </label>
          <select
            id={`${nameName}-line`}
            value={line}
            onChange={(e) => handleLineChange(e.target.value)}
            disabled={lines.length === 0}
            className="h-[42px] w-40 rounded border px-3 py-2 disabled:opacity-50"
          >
            <option value="">路線を選択</option>
            {lines.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={nameName} className="text-sm font-medium">
            駅
          </label>
          <select
            id={nameName}
            name={nameName}
            value={station}
            onChange={(e) => setStation(e.target.value)}
            disabled={stations.length === 0}
            className="h-[42px] w-40 rounded border px-3 py-2 disabled:opacity-50"
          >
            <option value="">駅を選択</option>
            {stations.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* 路線名は3つ目のselectのvalueと同期させ、実際に送信するのはこのhidden inputにする */}
      <input type="hidden" name={nameLine} value={line} readOnly />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
