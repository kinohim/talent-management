"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  saveSkills,
  type SkillFormState,
} from "@/app/(authenticated)/mypage/actions";
import { useSectionEdit } from "@/components/my-resume/EditableSection";
import { SkillRow } from "@/components/skills/SkillRow";
import { PillSelect } from "@/components/ui/PillSelect";
import type { SkillLevel } from "@/generated/prisma/client";
import { skillLevelSymbol } from "@/lib/employee-labels";
import { formatSkillWithVersion } from "@/lib/resume-view";
import type { SkillOptions } from "@/lib/skill-options";

export type SkillRowValue = {
  key: string;
  // 登録済み(初期表示に含まれていた)行はタグ表示、新規追加行は1行フォーム
  existing: boolean;
  skillCategoryId: string;
  skillId: string;
  skillNameInput: string;
  skillVersionId: string;
  skillLevel: string;
};

type SkillRowsFormProps = {
  options: SkillOptions;
  initialRows: Omit<SkillRowValue, "key" | "existing">[];
};

const initialSkillFormState: SkillFormState = {
  rowErrors: {},
  formError: null,
};

function emptyRow(key: string): SkillRowValue {
  return {
    key,
    existing: false,
    skillCategoryId: "",
    skillId: "",
    skillNameInput: "",
    skillVersionId: "",
    skillLevel: "",
  };
}

// 登録済みスキルのタグ(閲覧表示と同じ見た目)。押下で習熟度の変更パネルを
// 開閉し、×で削除する。スキル名・カテゴリの変更は削除→新規追加の運用のため
// タグからは変更できない。
function ExistingSkillTag({
  row,
  versionName,
  editing,
  onToggleEdit,
  onRemove,
}: {
  row: SkillRowValue;
  versionName: string | null;
  editing: boolean;
  onToggleEdit: () => void;
  onRemove: () => void;
}) {
  const label = formatSkillWithVersion(row.skillNameInput, versionName);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
        editing
          ? "border-zinc-500 bg-zinc-100 dark:bg-zinc-800"
          : "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
      }`}
    >
      <button
        type="button"
        onClick={onToggleEdit}
        title="押下で習熟度を変更"
        className="inline-flex items-center gap-1.5"
      >
        <span>{label}</span>
        <span aria-hidden="true" className="text-zinc-500">
          {row.skillLevel ? skillLevelSymbol(row.skillLevel as SkillLevel) : ""}
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${label}を削除`}
        className="text-zinc-400 hover:text-red-600"
      >
        ×
      </button>
    </span>
  );
}

export function SkillRowsForm({ options, initialRows }: SkillRowsFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveSkills,
    initialSkillFormState,
  );
  const nextKeyRef = useRef(initialRows.length);
  const [rows, setRows] = useState<SkillRowValue[]>(() =>
    initialRows.map((row, index) => ({
      ...row,
      key: `row-${index}`,
      existing: true,
    })),
  );
  // 習熟度変更パネルを開いている登録済み行のkey
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

  function updateRow(key: string, patch: Partial<SkillRowValue>) {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  const existingRows = rows.filter((row) => row.existing);
  const newRows = rows.filter((row) => !row.existing);
  const editingRow = existingRows.find((row) => row.key === editingKey) ?? null;

  function versionNameOf(row: SkillRowValue): string | null {
    if (!row.skillVersionId) return null;
    return (
      options.versions.find((v) => String(v.id) === row.skillVersionId)
        ?.versionName ?? null
    );
  }

  // 送信は従来どおり全行(タグ表示分含む)をitems.{index}.*のhidden inputで送る
  // (Server Action側の全置換保存の形式を変えないため)。indexはrows配列全体での
  // 位置を使い、rowErrorsのindexとも一致させる。
  const indexByKey = new Map(rows.map((row, index) => [row.key, index]));

  const existingRowErrors = existingRows
    .map((row) => {
      const errors = state.rowErrors[indexByKey.get(row.key) ?? -1];
      if (!errors) return null;
      const messages = Object.values(errors).filter(Boolean);
      if (messages.length === 0) return null;
      return `${row.skillNameInput}: ${messages.join(" ")}`;
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
                <ExistingSkillTag
                  row={row}
                  versionName={versionNameOf(row)}
                  editing={editingKey === row.key}
                  onToggleEdit={() =>
                    setEditingKey((prev) => (prev === row.key ? null : row.key))
                  }
                  onRemove={() => removeRow(row.key)}
                />
                {/* タグ表示中の登録済み行の送信値 */}
                {(
                  [
                    ["skillCategoryId", row.skillCategoryId],
                    ["skillId", row.skillId],
                    ["skillVersionId", row.skillVersionId],
                    ["skillLevel", row.skillLevel],
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
            タグの押下で習熟度を変更、×で削除できます(スキル名の変更は削除して追加し直してください)
          </p>
          {editingRow ? (
            <div className="flex flex-wrap items-center gap-3 rounded border bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
              <span className="text-sm font-medium">
                「{formatSkillWithVersion(editingRow.skillNameInput, versionNameOf(editingRow))}」の習熟度
              </span>
              <PillSelect
                name={`skill-level-editor-${editingRow.key}`}
                value={editingRow.skillLevel}
                onChange={(value) => updateRow(editingRow.key, { skillLevel: value })}
                options={[
                  { value: "EXPERT", label: "◎ 得意" },
                  { value: "EXPERIENCED", label: "○ 経験あり" },
                  { value: "BASIC", label: "△ 基礎知識" },
                ]}
              />
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
            <SkillRow
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
          登録済みのスキルはありません。「スキルを追加」から登録してください。
        </p>
      ) : null}

      <button
        type="button"
        onClick={addRow}
        className="self-start rounded border px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
      >
        + スキルを追加
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
