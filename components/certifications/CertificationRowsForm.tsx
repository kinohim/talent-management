"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  saveCertifications,
  type CertificationFormState,
} from "@/app/(authenticated)/certifications/actions";
import { CertificationRow } from "@/components/certifications/CertificationRow";
import type { CertificationOptions } from "@/lib/certification-options";

export type CertificationRowValue = {
  key: string;
  certificationCategoryId: string;
  certificationId: string;
  certificationNameInput: string;
  acquiredDate: string;
  expirationDate: string;
};

type CertificationRowsFormProps = {
  options: CertificationOptions;
  initialRows: Omit<CertificationRowValue, "key">[];
};

const initialCertificationFormState: CertificationFormState = {
  rowErrors: {},
  formError: null,
};

function emptyRow(key: string): CertificationRowValue {
  return {
    key,
    certificationCategoryId: "",
    certificationId: "",
    certificationNameInput: "",
    acquiredDate: "",
    expirationDate: "",
  };
}

export function CertificationRowsForm({
  options,
  initialRows,
}: CertificationRowsFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveCertifications,
    initialCertificationFormState,
  );
  const nextKeyRef = useRef(initialRows.length);
  const [rows, setRows] = useState<CertificationRowValue[]>(() =>
    initialRows.map((row, index) => ({ ...row, key: `row-${index}` })),
  );

  // React DOMのフォームaction機能はaction完了後に非制御フィールドを自動リセット
  // するが、controlled <select> の見た目がその後の再コミットで復元されないケースが
  // あるため、action完了ごとに全行を強制的に再マウントして正しい値を再描画させる。
  const [remountToken, setRemountToken] = useState(0);
  const prevStateRef = useRef(state);
  useEffect(() => {
    if (prevStateRef.current !== state) {
      prevStateRef.current = state;
      setRemountToken((token) => token + 1);
    }
  }, [state]);

  function addRow() {
    const key = `row-${nextKeyRef.current}`;
    nextKeyRef.current += 1;
    setRows((prev) => [...prev, emptyRow(key)]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((row) => row.key !== key));
  }

  function updateRow(key: string, patch: Partial<CertificationRowValue>) {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        {rows.map((row, index) => (
          <CertificationRow
            key={`${row.key}-${remountToken}`}
            index={index}
            row={row}
            options={options}
            fieldErrors={state.rowErrors[index]}
            onChange={(patch) => updateRow(row.key, patch)}
            onRemove={() => removeRow(row.key)}
          />
        ))}
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">
            登録済みの資格はありません。「行を追加」から登録してください。
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="self-start rounded border px-4 py-2 text-sm"
      >
        + 行を追加
      </button>

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
