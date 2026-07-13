"use client";

import { useRouter } from "next/navigation";

import type { OrganizationUnitNode } from "@/lib/organization-unit-tree";

const DEPTH_PADDING = ["pl-0", "pl-4", "pl-8"];

type OrganizationUnitRadioFilterProps = {
  tree: OrganizationUnitNode[];
  value: number | null;
};

// REF008の組織単位選択。単一選択(ラジオ)で、選択すると即座にURLの`unitId`を
// 更新する(REF002/REF007の複数条件フォームと異なり単一項目のため送信ボタンは
// 設けない)。先頭の「全社」を選ぶと`unitId`なし(=全社集計)になる。
export function OrganizationUnitRadioFilter({
  tree,
  value,
}: OrganizationUnitRadioFilterProps) {
  const router = useRouter();

  function select(id: number | null) {
    router.push(id == null ? "/skill-map" : `/skill-map?unitId=${id}`);
  }

  function renderNode(node: OrganizationUnitNode, depth: number) {
    return (
      <div key={node.id} className={DEPTH_PADDING[depth] ?? "pl-8"}>
        <label className="flex items-center gap-2 py-0.5 text-sm">
          <input
            type="radio"
            name="skill-map-unit"
            checked={value === node.id}
            onChange={() => select(node.id)}
          />
          {node.unitName}
        </label>
        {node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="flex max-h-64 flex-col overflow-y-auto rounded border p-2">
      <label className="flex items-center gap-2 py-0.5 text-sm font-medium">
        <input
          type="radio"
          name="skill-map-unit"
          checked={value == null}
          onChange={() => select(null)}
        />
        全社
      </label>
      {tree.map((node) => renderNode(node, 0))}
    </div>
  );
}
