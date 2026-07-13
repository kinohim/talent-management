"use client";

import { useActionState, useState, useTransition } from "react";

import {
  reinstateAccount,
  retireAccount,
  updateAccount,
} from "@/app/(authenticated)/accounts/actions";
import { OrganizationUnitSelect } from "@/components/basic-info/OrganizationUnitSelect";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { EditAccountFormState } from "@/lib/account-schema";
import type {
  OrganizationUnitOption,
  OrganizationUnitSelection,
} from "@/lib/organization-unit";

const initialState: EditAccountFormState = { error: null };

const ROLE_OPTIONS = [
  { value: "EMPLOYEE", label: "一般社員" },
  { value: "HR_SALES", label: "人事・営業" },
  { value: "MANAGER", label: "管理職" },
];

type EditAccountFormProps = {
  employeeId: string;
  displayName: string;
  email: string;
  role: string;
  employmentStatus: "ACTIVE" | "RETIRED";
  units: OrganizationUnitOption[];
  orgSelection: OrganizationUnitSelection;
};

export function EditAccountForm({
  employeeId,
  displayName,
  email,
  role,
  employmentStatus,
  units,
  orgSelection,
}: EditAccountFormProps) {
  const updateAction = updateAccount.bind(null, employeeId);
  const [state, formAction, isPending] = useActionState(updateAction, initialState);

  const [showRetireConfirm, setShowRetireConfirm] = useState(false);
  const [showReinstateConfirm, setShowReinstateConfirm] = useState(false);
  const [isStatusPending, startStatusTransition] = useTransition();

  function handleRetire() {
    startStatusTransition(async () => {
      await retireAccount(employeeId);
      setShowRetireConfirm(false);
    });
  }

  function handleReinstate() {
    startStatusTransition(async () => {
      await reinstateAccount(employeeId);
      setShowReinstateConfirm(false);
    });
  }

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">対象社員</span>
          <p className="text-sm">
            {displayName}(社員ID: {employeeId})
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">メールアドレス</span>
          <p className="text-sm">{email}</p>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">所属部署</span>
          <OrganizationUnitSelect
            units={units}
            defaultDivisionId={orgSelection.divisionId}
            defaultDepartmentId={orgSelection.departmentId}
            defaultGroupId={orgSelection.groupId}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            権限 <span className="text-red-600">*</span>
          </label>
          <select name="role" defaultValue={role} className="rounded border px-3 py-2">
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {state.error ? (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded bg-zinc-900 px-6 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {isPending ? "保存中..." : "保存"}
        </button>
      </form>

      <div className="rounded border border-red-300 p-4">
        {employmentStatus === "ACTIVE" ? (
          <button
            type="button"
            onClick={() => setShowRetireConfirm(true)}
            className="rounded border border-red-600 px-4 py-2 text-sm text-red-600"
          >
            退職処理
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowReinstateConfirm(true)}
            className="rounded border px-4 py-2 text-sm"
          >
            現職に戻す
          </button>
        )}
      </div>

      {showRetireConfirm ? (
        <ConfirmDialog
          message="この社員を退職処理します。よろしいですか？"
          confirmLabel="退職処理する"
          isPending={isStatusPending}
          onConfirm={handleRetire}
          onCancel={() => setShowRetireConfirm(false)}
        />
      ) : null}

      {showReinstateConfirm ? (
        <ConfirmDialog
          message="この社員を現職に戻します。よろしいですか？"
          confirmLabel="現職に戻す"
          isPending={isStatusPending}
          onConfirm={handleReinstate}
          onCancel={() => setShowReinstateConfirm(false)}
        />
      ) : null}
    </div>
  );
}
