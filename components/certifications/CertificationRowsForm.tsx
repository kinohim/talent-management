"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  saveCertifications,
  type CertificationFormState,
} from "@/app/(authenticated)/mypage/actions";
import { CertificationRow } from "@/components/certifications/CertificationRow";
import { useSectionEdit } from "@/components/my-resume/EditableSection";
import { DateField } from "@/components/ui/DateField";
import type { CertificationOptions } from "@/lib/certification-options";
import { formatMonthDay } from "@/lib/skill-map";

export type CertificationRowValue = {
  key: string;
  // 登録済み(初期表示に含まれていた)行はタグ表示、新規追加行は1行フォーム
  existing: boolean;
  certificationCategoryId: string;
  certificationId: string;
  certificationNameInput: string;
  acquiredDate: string;
  expirationDate: string;
};

type CertificationRowsFormProps = {
  options: CertificationOptions;
  initialRows: Omit<CertificationRowValue, "key" | "existing">[];
};

const initialCertificationFormState: CertificationFormState = {
  rowErrors: {},
  formError: null,
};

function emptyRow(key: string): CertificationRowValue {
  return {
    key,
    existing: false,
    certificationCategoryId: "",
    certificationId: "",
    certificationNameInput: "",
    acquiredDate: "",
    expirationDate: "",
  };
}

// "YYYY-MM-DD"→"YYYY/M/D"(タグの取得日表示用)
function displayDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return `${value.slice(0, 4)}/${formatMonthDay(value)}`;
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
    initialRows.map((row, index) => ({
      ...row,
      key: `row-${index}`,
      existing: true,
    })),
  );
  // 取得年月日・有効期限の変更パネルを開いている登録済み行のkey
  const [editingKey, setEditingKey] = useState<string | null>(null);

  // React DOMのフォームaction機能はaction完了後に非制御フィールドを自動リセット
  // するが、controlled <select> の見た目がその後の再コミットで復元されないケースが
  // あるため、action完了ごとに全行を強制的に再マウントして正しい値を再描画させる。
  const [remountToken, setRemountToken] = useState(0);
  // セクション編集(私の経歴書)では保存成功をEditableSectionへ通知して
  // 編集モードを解除する。Contextが無い文脈では何もしない。
  const sectionEdit = useSectionEdit();
  const prevStateRef = useRef(state);
  useEffect(() => {
    if (prevStateRef.current !== state) {
      prevStateRef.current = state;
      setRemountToken((token) => token + 1);
      if (state.saved) sectionEdit?.onSaved();
    }
  }, [state, sectionEdit]);
  // セクション編集ではヘッダの保存ボタン(EditableSection)に送信中状態を反映する
  useEffect(() => {
    sectionEdit?.setPending(isPending);
  }, [isPending, sectionEdit]);

  function addRow() {
    const key = `row-${nextKeyRef.current}`;
    nextKeyRef.current += 1;
    setRows((prev) => [...prev, emptyRow(key)]);
  }

  function removeRow(key: string) {
    if (editingKey === key) setEditingKey(null);
    setRows((prev) => prev.filter((row) => row.key !== key));
  }

  function updateRow(key: string, patch: Partial<CertificationRowValue>) {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  const existingRows = rows.filter((row) => row.existing);
  const newRows = rows.filter((row) => !row.existing);
  const editingRow = existingRows.find((row) => row.key === editingKey) ?? null;
  const indexByKey = new Map(rows.map((row, index) => [row.key, index]));

  const existingRowErrors = existingRows
    .map((row) => {
      const errors = state.rowErrors[indexByKey.get(row.key) ?? -1];
      if (!errors) return null;
      const messages = Object.values(errors).filter(Boolean);
      if (messages.length === 0) return null;
      return `${row.certificationNameInput}: ${messages.join(" ")}`;
    })
    .filter((message): message is string => message != null);

  return (
    <form
      id={sectionEdit?.formId}
      action={formAction}
      className="flex max-w-3xl flex-col gap-4"
    >
      {existingRows.length > 0 ? (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-wrap gap-2">
            {existingRows.map((row) => (
              <li key={`${row.key}-${remountToken}`}>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                    editingKey === row.key
                      ? "border-zinc-500 bg-zinc-100 dark:bg-zinc-800"
                      : "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setEditingKey((prev) => (prev === row.key ? null : row.key))
                    }
                    title="押下で取得年月日・有効期限を変更"
                    className="inline-flex items-baseline gap-1.5"
                  >
                    <span className="text-xs text-zinc-500">
                      {displayDate(row.acquiredDate)}
                    </span>
                    <span>{row.certificationNameInput}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    aria-label={`${row.certificationNameInput}を削除`}
                    className="text-zinc-400 hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
                {/* タグ表示中の登録済み行の送信値 */}
                {(
                  [
                    ["certificationCategoryId", row.certificationCategoryId],
                    ["certificationId", row.certificationId],
                    ["acquiredDate", row.acquiredDate],
                    ["expirationDate", row.expirationDate],
                  ] as const
                ).map(([field, value]) => (
                  <input
                    key={field}
                    type="hidden"
                    name={`items.${indexByKey.get(row.key)}.${field}`}
                    value={value}
                  />
                ))}
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500">
            タグの押下で取得年月日・有効期限を変更、×で削除できます(資格名の変更は削除して追加し直してください)
          </p>
          {editingRow ? (
            <div className="flex flex-wrap items-center gap-3 rounded border bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
              <span className="text-sm font-medium">
                「{editingRow.certificationNameInput}」
              </span>
              <label className="flex items-center gap-2 text-sm">
                取得年月日
                <DateField
                  value={editingRow.acquiredDate}
                  onChange={(e) =>
                    updateRow(editingRow.key, { acquiredDate: e.target.value })
                  }
                  className="px-2 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                有効期限
                <DateField
                  value={editingRow.expirationDate}
                  onChange={(e) =>
                    updateRow(editingRow.key, { expirationDate: e.target.value })
                  }
                  className="px-2 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={() => setEditingKey(null)}
                className="rounded border px-3 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                閉じる
              </button>
            </div>
          ) : null}
          {existingRowErrors.map((message, i) => (
            <p key={i} className="text-sm text-red-600">
              {message}
            </p>
          ))}
        </div>
      ) : null}

      {newRows.length > 0 ? (
        <div className="flex flex-col gap-2">
          {newRows.map((row) => (
            <CertificationRow
              key={`${row.key}-${remountToken}`}
              index={indexByKey.get(row.key) ?? 0}
              row={row}
              options={options}
              fieldErrors={state.rowErrors[indexByKey.get(row.key) ?? -1]}
              onChange={(patch) => updateRow(row.key, patch)}
              onRemove={() => removeRow(row.key)}
            />
          ))}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">
          登録済みの資格はありません。「資格を追加」から登録してください。
        </p>
      ) : null}

      <button
        type="button"
        onClick={addRow}
        className="self-start rounded border px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
      >
        + 資格を追加
      </button>

      {state.formError ? (
        <p role="alert" className="text-sm text-red-600">
          {state.formError}
        </p>
      ) : null}

      {/* セクション編集では保存ボタンはEditableSectionのヘッダ側に出す */}
      {sectionEdit ? null : (
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded bg-zinc-900 px-6 py-2 text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {isPending ? "保存中..." : "保存"}
        </button>
      )}
    </form>
  );
}
