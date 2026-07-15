"use client";

import { useState } from "react";

import {
  ProjectSkillRow,
  type ProjectSkillRowValue,
} from "@/components/projects/ProjectSkillRow";
import type { ProjectSkillRowFieldErrors } from "@/lib/project-schema";
import { formatSkillWithVersion } from "@/lib/resume-view";
import type { SkillOptions } from "@/lib/skill-options";

export type ProjectSkillEditorRow = ProjectSkillRowValue & {
  key: string;
  // 登録済み(初期表示に含まれていた)行はタグ表示、新規追加行は1行フォーム
  existing: boolean;
};

type ProjectSkillEditorProps = {
  options: SkillOptions;
  rows: ProjectSkillEditorRow[];
  rowErrors: Record<number, ProjectSkillRowFieldErrors | undefined>;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onUpdate: (key: string, patch: Partial<ProjectSkillRowValue>) => void;
};

// EDT005の使用スキルブロック(EDT003のスキル登録と同じタグ型UI)。
// 登録済み分はタグ表示(×で削除、押下でバージョンのみ変更可。スキル名の変更は
// 削除→新規追加の運用)、新規追加は「+ スキルを追加」の1行フォーム。
export function ProjectSkillEditor({
  options,
  rows,
  rowErrors,
  onAdd,
  onRemove,
  onUpdate,
}: ProjectSkillEditorProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const existingRows = rows.filter((row) => row.existing);
  const newRows = rows.filter((row) => !row.existing);
  const indexByKey = new Map(rows.map((row, index) => [row.key, index]));
  const editingRow = existingRows.find((row) => row.key === editingKey) ?? null;

  function versionNameOf(row: ProjectSkillRowValue): string | null {
    if (!row.skillVersionId) return null;
    return (
      options.versions.find((v) => String(v.id) === row.skillVersionId)
        ?.versionName ?? null
    );
  }

  function versionsOf(row: ProjectSkillRowValue) {
    const skill = options.skills.find((s) => String(s.id) === row.skillId);
    if (!skill?.hasVersion) return null;
    return options.versions.filter(
      (v) =>
        v.skillId === skill.id && (v.isActive || String(v.id) === row.skillVersionId),
    );
  }

  const existingRowErrors = existingRows
    .map((row) => {
      const errors = rowErrors[indexByKey.get(row.key) ?? -1];
      if (!errors) return null;
      const messages = Object.values(errors).filter(Boolean);
      if (messages.length === 0) return null;
      return `${row.skillNameInput}: ${messages.join(" ")}`;
    })
    .filter((message): message is string => message != null);

  const editingVersions = editingRow ? versionsOf(editingRow) : null;

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium">使用スキル</span>

      {existingRows.length > 0 ? (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-wrap gap-2">
            {existingRows.map((row) => {
              const label = formatSkillWithVersion(
                row.skillNameInput,
                versionNameOf(row),
              );
              return (
                <li key={row.key}>
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
                      title="押下でバージョンを変更"
                    >
                      {label}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (editingKey === row.key) setEditingKey(null);
                        onRemove(row.key);
                      }}
                      aria-label={`${label}を削除`}
                      className="text-zinc-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                  {/* タグ表示中の登録済み行の送信値 */}
                  {(
                    [
                      ["skillCategoryId", row.skillCategoryId],
                      ["skillId", row.skillId],
                      ["skillVersionId", row.skillVersionId],
                    ] as const
                  ).map(([field, value]) => (
                    <input
                      key={field}
                      type="hidden"
                      name={`skills.${indexByKey.get(row.key)}.${field}`}
                      value={value}
                    />
                  ))}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-zinc-500">
            タグの押下でバージョンを変更、×で削除できます(スキル名の変更は削除して追加し直してください)
          </p>
          {editingRow ? (
            <div className="flex flex-wrap items-center gap-3 rounded border bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
              <span className="text-sm font-medium">
                「{editingRow.skillNameInput}」のバージョン
              </span>
              {editingVersions ? (
                <select
                  aria-label="バージョン"
                  value={editingRow.skillVersionId}
                  onChange={(e) =>
                    onUpdate(editingRow.key, { skillVersionId: e.target.value })
                  }
                  className="rounded border px-2 py-1.5 text-sm"
                >
                  <option value="">選択してください</option>
                  {editingVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.versionName}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm text-zinc-500">
                  このスキルはバージョン管理対象外です
                </span>
              )}
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

      {newRows.map((row) => (
        <ProjectSkillRow
          key={row.key}
          index={indexByKey.get(row.key) ?? 0}
          row={row}
          options={options}
          fieldErrors={rowErrors[indexByKey.get(row.key) ?? -1]}
          onChange={(patch) => onUpdate(row.key, patch)}
          onRemove={() => onRemove(row.key)}
        />
      ))}

      <button
        type="button"
        onClick={onAdd}
        className="self-start rounded border px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
      >
        + スキルを追加
      </button>
    </div>
  );
}
