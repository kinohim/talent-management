"use client";

import { saveSite } from "@/app/(authenticated)/master/sites/actions";
import { InlineAddForm } from "@/components/master/InlineAddForm";
import { SiteMasterRow, type SiteMasterSite } from "@/components/master/SiteMasterRow";

const createSiteAction = saveSite.bind(null, null);

export function SiteMasterManager({ sites }: { sites: SiteMasterSite[] }) {
  const sortedSites = sites
    .slice()
    .sort((a, b) => a.siteName.localeCompare(b.siteName, "ja"));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {/* 現場の追加フィールドは最上部に常時表示(コンパクトな1行形) */}
      <InlineAddForm
        action={createSiteAction}
        name="siteName"
        placeholder="現場名"
        submitLabel="現場を追加"
      />

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
