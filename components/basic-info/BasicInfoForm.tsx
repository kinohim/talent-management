"use client";

import { useActionState } from "react";

import {
  saveBasicInfo,
  type BasicInfoFormState,
} from "@/app/(authenticated)/register/actions";
import { OrganizationUnitSelect } from "@/components/basic-info/OrganizationUnitSelect";
import { PillSelect } from "@/components/ui/PillSelect";
import type {
  FinalSchoolType,
  Gender,
  GraduationStatus,
} from "@/generated/prisma/client";
import type {
  OrganizationUnitOption,
  OrganizationUnitSelection,
} from "@/lib/organization-unit";

type BasicInfoFormProps = {
  employeeId: string;
  email: string;
  defaultValues: {
    name: string;
    nameKana: string;
    birthDate: string;
    gender: Gender | null;
    nearestStationLine: string;
    nearestStationName: string;
    finalSchoolType: FinalSchoolType | null;
    finalSchoolName: string;
    finalDepartmentName: string;
    graduationStatus: GraduationStatus | null;
    graduationYearMonth: string;
  };
  units: OrganizationUnitOption[];
  selection: OrganizationUnitSelection;
};

const initialBasicInfoFormState: BasicInfoFormState = {
  fieldErrors: {},
  formError: null,
};

export function BasicInfoForm({
  employeeId,
  email,
  defaultValues,
  units,
  selection,
}: BasicInfoFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveBasicInfo,
    initialBasicInfoFormState,
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-500">社員ID</span>
          <span>{employeeId}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-500">
            メールアドレス
          </span>
          <span>{email}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          氏名 <span className="text-red-600">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={defaultValues.name}
          required
          className="rounded border px-3 py-2"
        />
        {state.fieldErrors.name ? (
          <p className="text-sm text-red-600">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="nameKana" className="text-sm font-medium">
          カナ <span className="text-red-600">*</span>
        </label>
        <input
          id="nameKana"
          name="nameKana"
          type="text"
          defaultValue={defaultValues.nameKana}
          required
          className="rounded border px-3 py-2"
        />
        {state.fieldErrors.nameKana ? (
          <p className="text-sm text-red-600">{state.fieldErrors.nameKana}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="birthDate" className="text-sm font-medium">
          生年月日 <span className="text-red-600">*</span>
        </label>
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          defaultValue={defaultValues.birthDate}
          required
          className="rounded border px-3 py-2"
        />
        {state.fieldErrors.birthDate ? (
          <p className="text-sm text-red-600">{state.fieldErrors.birthDate}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">性別</span>
        <PillSelect
          name="gender"
          defaultValue={defaultValues.gender ?? undefined}
          options={[
            { value: "MALE", label: "男性" },
            { value: "FEMALE", label: "女性" },
            { value: "OTHER", label: "その他" },
          ]}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">所属組織</span>
        <OrganizationUnitSelect
          units={units}
          defaultDivisionId={selection.divisionId}
          defaultDepartmentId={selection.departmentId}
          defaultGroupId={selection.groupId}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="nearestStationLine" className="text-sm font-medium">
            最寄駅(路線名)
          </label>
          <input
            id="nearestStationLine"
            name="nearestStationLine"
            type="text"
            placeholder="例: JR山手線"
            defaultValue={defaultValues.nearestStationLine}
            className="rounded border px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="nearestStationName" className="text-sm font-medium">
            最寄駅(駅名)
          </label>
          <input
            id="nearestStationName"
            name="nearestStationName"
            type="text"
            placeholder="例: 渋谷駅"
            defaultValue={defaultValues.nearestStationName}
            className="rounded border px-3 py-2"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="finalSchoolType" className="text-sm font-medium">
          学校種別
        </label>
        <select
          id="finalSchoolType"
          name="finalSchoolType"
          defaultValue={defaultValues.finalSchoolType ?? ""}
          className="rounded border px-3 py-2"
        >
          <option value="">選択しない</option>
          <option value="HIGH_SCHOOL">高校</option>
          <option value="VOCATIONAL_SCHOOL">専門学校</option>
          <option value="JUNIOR_COLLEGE">短大</option>
          <option value="UNIVERSITY">大学</option>
          <option value="GRADUATE_SCHOOL">大学院</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="finalSchoolName" className="text-sm font-medium">
            最終学歴(学校名)
          </label>
          <input
            id="finalSchoolName"
            name="finalSchoolName"
            type="text"
            defaultValue={defaultValues.finalSchoolName}
            className="rounded border px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="finalDepartmentName" className="text-sm font-medium">
            最終学歴(学部・学科名)
          </label>
          <input
            id="finalDepartmentName"
            name="finalDepartmentName"
            type="text"
            defaultValue={defaultValues.finalDepartmentName}
            className="rounded border px-3 py-2"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">卒業状況</span>
        <PillSelect
          name="graduationStatus"
          defaultValue={defaultValues.graduationStatus ?? undefined}
          options={[
            { value: "GRADUATED", label: "卒業" },
            { value: "WITHDRAWN", label: "中退" },
          ]}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="graduationYearMonth" className="text-sm font-medium">
          卒業年月
        </label>
        <input
          id="graduationYearMonth"
          name="graduationYearMonth"
          type="month"
          defaultValue={defaultValues.graduationYearMonth}
          className="rounded border px-3 py-2"
        />
      </div>

      {state.formError ? (
        <p role="alert" className="text-sm text-red-600">
          {state.formError}
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
  );
}
