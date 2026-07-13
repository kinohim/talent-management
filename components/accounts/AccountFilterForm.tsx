"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { OrganizationUnitTreeFilter } from "@/components/accounts/OrganizationUnitTreeFilter";
import { PillMultiSelect } from "@/components/ui/PillMultiSelect";
import type { OrganizationUnitNode } from "@/lib/organization-unit-tree";

const ROLE_OPTIONS = [
  { value: "EMPLOYEE", label: "一般社員" },
  { value: "HR_SALES", label: "人事・営業" },
  { value: "MANAGER", label: "管理職" },
];

const STATUS_OPTIONS = [
  { value: "UNREGISTERED", label: "初回未登録" },
  { value: "ACTIVE", label: "在籍中" },
  { value: "RETIRED", label: "退職" },
];

type AccountFilterFormProps = {
  orgTree: OrganizationUnitNode[];
  initialName: string;
  initialOrgUnitIds: number[];
  initialRoles: string[];
  initialStatuses: string[];
};

// REF007のフィルタは検索条件をURLのsearchParamsに反映することで管理する
// (Server Componentの`page.tsx`がそのままDBクエリのwhere条件に変換する)。
// 送信は`router.push`によるクライアント側ナビゲーションで行う。
export function AccountFilterForm({
  orgTree,
  initialName,
  initialOrgUnitIds,
  initialRoles,
  initialStatuses,
}: AccountFilterFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [orgUnitIds, setOrgUnitIds] = useState<number[]>(initialOrgUnitIds);
  const [roles, setRoles] = useState<string[]>(initialRoles);
  const [statuses, setStatuses] = useState<string[]>(initialStatuses);

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (name) params.set("name", name);
    for (const id of orgUnitIds) params.append("orgUnitId", String(id));
    for (const role of roles) params.append("role", role);
    for (const status of statuses) params.append("status", status);
    router.push(`/accounts?${params.toString()}`);
  }

  return (
    <form onSubmit={applyFilters} className="flex flex-col gap-4 rounded border p-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">氏名検索</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="氏名で検索"
          className="rounded border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">所属組織</span>
        <OrganizationUnitTreeFilter
          tree={orgTree}
          values={orgUnitIds}
          onChange={setOrgUnitIds}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">権限</span>
        <PillMultiSelect name="role" options={ROLE_OPTIONS} values={roles} onChange={setRoles} />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">状態</span>
        <PillMultiSelect
          name="status"
          options={STATUS_OPTIONS}
          values={statuses}
          onChange={setStatuses}
        />
      </div>

      <button
        type="submit"
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        絞り込む
      </button>
    </form>
  );
}
