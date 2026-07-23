"use client";

import { createOrganizationUnit } from "@/app/(authenticated)/master/organization-units/actions";
import { InlineAddForm } from "@/components/master/InlineAddForm";
import { OrganizationUnitNodeItem } from "@/components/master/OrganizationUnitNodeItem";
import type { OrganizationUnitNode } from "@/lib/organization-unit-tree";

const createDivisionAction = createOrganizationUnit.bind(null, null);

export function OrganizationUnitManager({
  tree,
}: {
  tree: OrganizationUnitNode[];
}) {
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      {/* 事業部の追加フィールドは最上部に常時表示(「配下に追加」と同じ
          コンパクトな1行形) */}
      <InlineAddForm
        action={createDivisionAction}
        name="unitName"
        placeholder="事業部名"
        submitLabel="事業部を追加"
      />

      <div className="flex flex-col gap-1">
        {tree.length === 0 ? (
          <p className="text-sm text-foreground/60">
            登録済みの組織単位はありません。
          </p>
        ) : (
          tree.map((node) => (
            <OrganizationUnitNodeItem key={node.id} node={node} depth={0} />
          ))
        )}
      </div>
    </div>
  );
}
