"use client";

import { useMemo, useState } from "react";

import type { OrganizationUnitOption } from "@/lib/organization-unit";

const NONE = "";

export function OrganizationUnitSelect({
  units,
  defaultDivisionId,
  defaultDepartmentId,
  defaultGroupId,
}: {
  units: OrganizationUnitOption[];
  defaultDivisionId: number | null;
  defaultDepartmentId: number | null;
  defaultGroupId: number | null;
}) {
  const [divisionId, setDivisionId] = useState(
    defaultDivisionId?.toString() ?? NONE,
  );
  const [departmentId, setDepartmentId] = useState(
    defaultDepartmentId?.toString() ?? NONE,
  );
  const [groupId, setGroupId] = useState(defaultGroupId?.toString() ?? NONE);

  const divisions = useMemo(
    () => units.filter((u) => u.unitLevel === "DIVISION"),
    [units],
  );
  const departments = useMemo(
    () =>
      units.filter(
        (u) => u.unitLevel === "DEPARTMENT" && String(u.parentId) === divisionId,
      ),
    [units, divisionId],
  );
  const groups = useMemo(
    () =>
      units.filter(
        (u) => u.unitLevel === "GROUP" && String(u.parentId) === departmentId,
      ),
    [units, departmentId],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="divisionId" className="text-sm font-medium">
          所属事業部
        </label>
        <select
          id="divisionId"
          name="divisionId"
          value={divisionId}
          onChange={(e) => {
            setDivisionId(e.target.value);
            setDepartmentId(NONE);
            setGroupId(NONE);
          }}
          className="h-[42px] rounded border px-3 py-2"
        >
          <option value={NONE}>なし</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.unitName}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="departmentId" className="text-sm font-medium">
          所属部署
        </label>
        <select
          id="departmentId"
          name="departmentId"
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setGroupId(NONE);
          }}
          disabled={!divisionId}
          className="h-[42px] rounded border px-3 py-2 disabled:opacity-50"
        >
          <option value={NONE}>なし</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.unitName}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="groupId" className="text-sm font-medium">
          所属Gr
        </label>
        <select
          id="groupId"
          name="groupId"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          disabled={!departmentId}
          className="h-[42px] rounded border px-3 py-2 disabled:opacity-50"
        >
          <option value={NONE}>なし</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.unitName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
