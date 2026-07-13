"use client";

import { useActionState, useState } from "react";

import { saveSite } from "@/app/(authenticated)/master/sites/actions";
import { SiteMasterRow, type SiteMasterSite } from "@/components/master/SiteMasterRow";
import type { SiteMasterFormState } from "@/lib/site-master-schema";

const initialState: SiteMasterFormState = { error: null };
const createSiteAction = saveSite.bind(null, null);

export function SiteMasterManager({ sites }: { sites: SiteMasterSite[] }) {
  const [state, formAction, isPending] = useActionState(createSiteAction, initialState);
  const [resetKey, setResetKey] = useState(0);
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (!state.error) setResetKey((key) => key + 1);
  }

  const sortedSites = sites
    .slice()
    .sort((a, b) => a.siteName.localeCompare(b.siteName, "ja"));

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <form action={formAction} className="flex flex-col gap-3 rounded border p-4">
        <h2 className="text-sm font-semibold">現場を追加</h2>
        <input
          key={`site-name-${resetKey}`}
          type="text"
          name="siteName"
          placeholder="現場名"
          maxLength={100}
          className="rounded border px-2 py-1 text-sm"
        />
        {state.error ? (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {isPending ? "追加中..." : "現場を追加"}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {sortedSites.length === 0 ? (
          <p className="text-sm text-zinc-500">登録済みの現場はありません。</p>
        ) : (
          sortedSites.map((site) => <SiteMasterRow key={site.id} site={site} />)
        )}
      </div>
    </div>
  );
}
