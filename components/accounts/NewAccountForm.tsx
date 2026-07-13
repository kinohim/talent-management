"use client";

import { useActionState } from "react";

import { createAccount } from "@/app/(authenticated)/accounts/actions";
import { OrganizationUnitSelect } from "@/components/basic-info/OrganizationUnitSelect";
import type { NewAccountFormState } from "@/lib/account-schema";
import type { OrganizationUnitOption } from "@/lib/organization-unit";

const initialState: NewAccountFormState = { error: null };

const ROLE_OPTIONS = [
  { value: "EMPLOYEE", label: "一般社員" },
  { value: "HR_SALES", label: "人事・営業" },
  { value: "MANAGER", label: "管理職" },
];

export function NewAccountForm({ units }: { units: OrganizationUnitOption[] }) {
  const [state, formAction, isPending] = useActionState(createAccount, initialState);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          社員ID <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          name="employeeId"
          maxLength={6}
          placeholder="000000"
          className="rounded border px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          メールアドレス <span className="text-red-600">*</span>
        </label>
        <input type="email" name="email" className="rounded border px-3 py-2" />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">所属部署</span>
        <OrganizationUnitSelect
          units={units}
          defaultDivisionId={null}
          defaultDepartmentId={null}
          defaultGroupId={null}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          権限 <span className="text-red-600">*</span>
        </label>
        <select name="role" defaultValue="" className="rounded border px-3 py-2">
          <option value="" disabled>
            選択してください
          </option>
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
        {isPending ? "登録中..." : "登録"}
      </button>
    </form>
  );
}
