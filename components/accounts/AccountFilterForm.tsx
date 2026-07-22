"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { CascadingOrganizationUnitFilter } from "@/components/ui/CascadingOrganizationUnitFilter";
import { ClearableInput } from "@/components/ui/ClearableInput";
import {
  CollapsibleSearchCard,
  notifySearchExecuted,
} from "@/components/ui/CollapsibleSearchCard";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { PillMultiSelect } from "@/components/ui/PillMultiSelect";
import {
  SearchFilterField,
  SearchFilterGrid,
} from "@/components/ui/SearchFilterGrid";
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

// account-listのフィルタは検索条件をURLのsearchParamsに反映することで管理する
// (Server Componentの`page.tsx`がそのままDBクエリのwhere条件に変換する)。
// 送信は`router.push`によるクライアント側ナビゲーションで行う。
// 項目順: 氏名カナ→所属組織→権限→状態→検索/クリア(docs/screens.md account-list)
export function AccountFilterForm({
  orgTree,
  initialName,
  initialOrgUnitIds,
  initialRoles,
  initialStatuses,
}: AccountFilterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(initialName);
  const [orgUnitIds, setOrgUnitIds] = useState<number[]>(initialOrgUnitIds);
  const [roles, setRoles] = useState<string[]>(initialRoles);
  const [statuses, setStatuses] = useState<string[]>(initialStatuses);
  // 検索実行(ナビゲーション)中は画面全体にローディングを表示する
  const [isSearching, startSearch] = useTransition();

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    // 検索し直しなので列フィルタ(col*)・ソート・ページは破棄し1ページ目へ。
    // 表示件数(pageSize)だけはユーザー設定として引き継ぐ。
    const params = new URLSearchParams();
    const pageSize = searchParams.get("pageSize");
    if (pageSize) params.set("pageSize", pageSize);
    if (name) params.set("name", name);
    for (const id of orgUnitIds) params.append("orgUnitId", String(id));
    for (const role of roles) params.append("role", role);
    for (const status of statuses) params.append("status", status);
    notifySearchExecuted("/accounts");
    startSearch(() => {
      router.push(`/accounts?${params.toString()}`);
    });
  }

  // 全検索フィールドの一括クリア(検索は実行しない)
  function clearFilters() {
    setName("");
    setOrgUnitIds([]);
    setRoles([]);
    setStatuses([]);
  }

  // 全項目をSearchFilterGridの4列グリッドに並べる(resume-listと共通の
  // レイアウト)。氏名カナ→所属組織→権限→状態でちょうど1行4列に収まる。
  // ローディングはカードの外に置く(検索後に閉じる=ONだと検索直後にカードの
  // 中身がhiddenになり、内側に置くとオーバーレイごと消えてしまうため)
  return (
    <>
      <LoadingOverlay show={isSearching} />
      <CollapsibleSearchCard storageKey="/accounts">
        <SearchFilterGrid onSubmit={applyFilters} onClear={clearFilters}>
          <SearchFilterField label="氏名カナ">
            <ClearableInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="氏名・カナで検索"
              className="w-full text-sm"
            />
          </SearchFilterField>

          <SearchFilterField label="所属組織">
            <CascadingOrganizationUnitFilter
              tree={orgTree}
              values={orgUnitIds}
              onChange={setOrgUnitIds}
            />
          </SearchFilterField>

          <SearchFilterField label="権限">
            <PillMultiSelect
              name="role"
              options={ROLE_OPTIONS}
              values={roles}
              onChange={setRoles}
            />
          </SearchFilterField>

          <SearchFilterField label="状態">
            <PillMultiSelect
              name="status"
              options={STATUS_OPTIONS}
              values={statuses}
              onChange={setStatuses}
            />
          </SearchFilterField>
        </SearchFilterGrid>
      </CollapsibleSearchCard>
    </>
  );
}
