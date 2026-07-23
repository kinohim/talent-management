"use client";

import { useActionState, useState } from "react";

import { saveSite } from "@/app/(authenticated)/master/sites/actions";
import {
  SiteMasterRow,
  type SiteDepartmentOption,
  type SiteMasterSite,
} from "@/components/master/SiteMasterRow";
import { ClearableInput } from "@/components/ui/ClearableInput";
import { NearestStationSelect } from "@/components/ui/NearestStationSelect";
import type { SiteMasterFormState } from "@/lib/site-master-schema";

const createSiteAction = saveSite.bind(null, null);
const initialState: SiteMasterFormState = { error: null };

// 現場の追加フォーム(現場名+主管部署のコンパクトな1行形)
function SiteAddForm({ departments }: { departments: SiteDepartmentOption[] }) {
  const [state, formAction, isPending] = useActionState(createSiteAction, initialState);
  // 成功時に入力をリセットする(InlineAddFormと同じレンダー中prevState比較)
  const [prevState, setPrevState] = useState(state);
  const [resetKey, setResetKey] = useState(0);
  if (prevState !== state) {
    setPrevState(state);
    if (!state.error) setResetKey((key) => key + 1);
  }

  return (
    <form
      key={resetKey}
      action={formAction}
      className="flex flex-col gap-2 rounded-2xl border border-surface-border p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex w-64">
          <ClearableInput
            name="siteName"
            placeholder="現場名"
            maxLength={100}
            className="h-8 px-3 py-1 text-sm"
          />
        </span>
        <select
          name="organizationUnitId"
          aria-label="主管部署"
          defaultValue=""
          className="h-8 rounded-full border border-surface-border px-3 py-1 text-sm"
        >
          <option value="">主管部署なし</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <NearestStationSelect
          namePrefecture="nearestStationPrefecture"
          nameLine="nearestStationLine"
          nameName="nearestStationName"
          defaultPrefecture={null}
          defaultLine={null}
          defaultName={null}
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full border border-primary px-3 py-1 text-xs text-brand hover:bg-primary/10"
        >
          {isPending ? "追加中..." : "現場を追加"}
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function SiteMasterManager({
  sites,
  departments,
}: {
  sites: SiteMasterSite[];
  departments: SiteDepartmentOption[];
}) {
  // 現場名のあいまい絞り込み+主管部署での絞り込み(いずれもクライアント側)
  const [filter, setFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const normalizedFilter = filter.trim().toLowerCase();

  const sortedSites = sites
    .slice()
    .sort((a, b) => a.siteName.localeCompare(b.siteName, "ja"))
    .filter(
      (site) =>
        (normalizedFilter === "" ||
          site.siteName.toLowerCase().includes(normalizedFilter)) &&
        (departmentFilter === "" ||
          (departmentFilter === "none"
            ? site.organizationUnitId == null
            : String(site.organizationUnitId) === departmentFilter)),
    );

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <SiteAddForm departments={departments} />

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex max-w-sm flex-1 flex-col gap-1">
          <label className="text-sm font-medium">絞り込み</label>
          <ClearableInput
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="現場名で絞り込み"
            className="text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">主管部署</label>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-full border border-surface-border px-3 py-2 text-sm"
          >
            <option value="">すべて</option>
            <option value="none">主管部署なし</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {sortedSites.length === 0 ? (
          <p className="text-sm text-foreground/60">
            {normalizedFilter || departmentFilter
              ? "絞り込みに一致する現場はありません。"
              : "登録済みの現場はありません。"}
          </p>
        ) : (
          sortedSites.map((site) => (
            <SiteMasterRow key={site.id} site={site} departments={departments} />
          ))
        )}
      </div>
    </div>
  );
}
