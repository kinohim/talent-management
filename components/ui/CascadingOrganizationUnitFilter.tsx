"use client";

import type { OrganizationUnitNode } from "@/lib/organization-unit-tree";

type CascadingOrganizationUnitFilterProps = {
  tree: OrganizationUnitNode[];
  values: number[];
  onChange: (values: number[]) => void;
};

const LEVEL_LABELS: Record<string, string> = {
  DIVISION: "事業部",
  DEPARTMENT: "部署",
  GROUP: "Gr",
};

function collectSubtreeIds(node: OrganizationUnitNode): number[] {
  return [node.id, ...node.children.flatMap(collectSubtreeIds)];
}

// REF002/REF007の所属組織フィルタ(カスケード式)。初期表示はツリーの根
// (通常は事業部)のみで、上位をチェックすると配下が展開表示される。
// 未選択の親には配下の件数を添えて、選択すれば下位を絞り込めることを示す。
// チェックを外すと配下の選択もまとめて解除する。
export function CascadingOrganizationUnitFilter({
  tree,
  values,
  onChange,
}: CascadingOrganizationUnitFilterProps) {
  function toggle(node: OrganizationUnitNode) {
    if (values.includes(node.id)) {
      // 親の解除時は配下の選択も解除する(非表示になった選択が残らないように)
      const subtree = new Set(collectSubtreeIds(node));
      onChange(values.filter((v) => !subtree.has(v)));
    } else {
      onChange([...values, node.id]);
    }
  }

  function renderNode(node: OrganizationUnitNode, depth: number) {
    const checked = values.includes(node.id);
    const childLevel = node.children[0]?.unitLevel;
    return (
      <div key={node.id} className={depth > 0 ? "pl-5" : undefined}>
        <label className="flex items-center gap-2 py-0.5 text-sm">
          <input type="checkbox" checked={checked} onChange={() => toggle(node)} />
          <span>{node.unitName}</span>
          {node.children.length > 0 && !checked ? (
            <span className="text-xs text-zinc-400">
              ▸ {LEVEL_LABELS[childLevel ?? ""] ?? "配下"}
              {node.children.length}件
            </span>
          ) : null}
        </label>
        {checked
          ? node.children.map((child) => renderNode(child, depth + 1))
          : null}
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-1">
      <div className="flex max-h-48 flex-col overflow-y-auto rounded border p-2">
        {tree.length === 0 ? (
          <p className="text-sm text-zinc-500">組織単位が登録されていません。</p>
        ) : (
          tree.map((node) => renderNode(node, 0))
        )}
      </div>
      <p className="text-xs text-zinc-500">
        上位の組織を選択すると配下の組織で絞り込めます。
      </p>
    </div>
  );
}
