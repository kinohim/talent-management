"use client";

import type { OrganizationUnitNode } from "@/lib/organization-unit-tree";

const DEPTH_PADDING = ["pl-0", "pl-4", "pl-8"];

type OrganizationUnitTreeFilterProps = {
  tree: OrganizationUnitNode[];
  values: number[];
  onChange: (values: number[]) => void;
};

// REF007の所属組織フィルタ。事業部>部署>Grの階層をインデント付き
// チェックボックスで表示する(選択したidの配下展開はページ側で行う)。
export function OrganizationUnitTreeFilter({
  tree,
  values,
  onChange,
}: OrganizationUnitTreeFilterProps) {
  function toggle(id: number) {
    onChange(values.includes(id) ? values.filter((v) => v !== id) : [...values, id]);
  }

  function renderNode(node: OrganizationUnitNode, depth: number) {
    return (
      <div key={node.id} className={DEPTH_PADDING[depth] ?? "pl-8"}>
        <label className="flex items-center gap-2 py-0.5 text-sm">
          <input
            type="checkbox"
            checked={values.includes(node.id)}
            onChange={() => toggle(node.id)}
          />
          {node.unitName}
        </label>
        {node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="flex max-h-48 flex-col overflow-y-auto rounded border p-2">
      {tree.length === 0 ? (
        <p className="text-sm text-zinc-500">組織単位が登録されていません。</p>
      ) : (
        tree.map((node) => renderNode(node, 0))
      )}
    </div>
  );
}
