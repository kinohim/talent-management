"use client";

import { useEffect, useRef, useState } from "react";

import {
  categorizeLine,
  groupLinesByCategory,
  LINE_CATEGORIES,
  type LineCategory,
} from "@/lib/line-category";
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
  const [isLineOpen, setIsLineOpen] = useState(false);
  const [lineSearch, setLineSearch] = useState("");
  const [openCategory, setOpenCategory] = useState<LineCategory | null>(
    defaultLine ? categorizeLine(defaultLine) : null,
  );
  const lineFieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLineOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (lineFieldRef.current && !lineFieldRef.current.contains(e.target as Node)) {
        setIsLineOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isLineOpen]);

  async function handlePrefectureChange(value: string) {
    setPrefecture(value);
    setLine("");
    setStation("");
    setLines([]);
    setStations([]);
    setIsLineOpen(false);
    setLineSearch("");
    setOpenCategory(null);
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
    setIsLineOpen(false);
    setLineSearch("");
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

  const trimmedSearch = lineSearch.trim();
  const searchedLines = trimmedSearch
    ? lines.filter((l) => l.toLowerCase().includes(trimmedSearch.toLowerCase()))
    : [];
  const groupedLines = groupLinesByCategory(lines);

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
            className="h-[42px] w-full rounded border px-3 py-2"
          >
            <option value="">都道府県を選択</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div ref={lineFieldRef} className="relative flex flex-1 flex-col gap-1">
          <span id={`${nameName}-line-label`} className="text-sm font-medium">
            路線
          </span>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isLineOpen}
            aria-labelledby={`${nameName}-line-label`}
            disabled={lines.length === 0}
            onClick={() => setIsLineOpen((open) => !open)}
            className="flex h-[42px] w-full items-center justify-between rounded border px-3 py-2 text-left text-sm disabled:opacity-50"
          >
            <span className={`truncate ${line ? "" : "text-foreground/40"}`}>
              {line || "路線を選択"}
            </span>
            <span aria-hidden="true">⌄</span>
          </button>

          {isLineOpen && (
            <div className="absolute top-full z-10 mt-1 w-64 rounded border border-surface-border bg-surface shadow-lg">
              <div className="border-b p-2">
                <input
                  type="text"
                  value={lineSearch}
                  onChange={(e) => setLineSearch(e.target.value)}
                  placeholder="路線名で検索（任意）"
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {trimmedSearch ? (
                  searchedLines.length > 0 ? (
                    searchedLines.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => handleLineChange(l)}
                        aria-pressed={line === l}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-border/40 ${
                          line === l ? "bg-primary/10 font-semibold" : ""
                        }`}
                      >
                        {l}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-foreground/40">該当する路線がありません</p>
                  )
                ) : (
                  LINE_CATEGORIES.filter((category) => groupedLines[category].length > 0).map(
                    (category) => {
                      const panelId = `${nameName}-line-panel-${category}`;
                      const isCategoryOpen = openCategory === category;
                      return (
                        <div key={category} className="border-b last:border-b-0">
                          <button
                            type="button"
                            aria-expanded={isCategoryOpen}
                            aria-controls={panelId}
                            onClick={() =>
                              setOpenCategory((current) => (current === category ? null : category))
                            }
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium"
                          >
                            {category}
                            <span aria-hidden="true">{isCategoryOpen ? "▼" : "▶"}</span>
                          </button>
                          {isCategoryOpen && (
                            <div id={panelId} className="flex flex-col">
                              {groupedLines[category].map((l) => (
                                <button
                                  key={l}
                                  type="button"
                                  onClick={() => handleLineChange(l)}
                                  aria-pressed={line === l}
                                  className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-border/40 ${
                                    line === l ? "bg-primary/10 font-semibold" : ""
                                  }`}
                                >
                                  {l}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    },
                  )
                )}
              </div>
            </div>
          )}
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
            className="h-[42px] w-full rounded border px-3 py-2 disabled:opacity-50"
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
      {/* 路線はドロップダウン内のボタン選択のためnameを持たず、選択値はこのhidden inputで送信する */}
      <input type="hidden" name={nameLine} value={line} readOnly />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
