"use client";

import { ClearableInput } from "@/components/ui/ClearableInput";
import type { ProjectSkillRowFieldErrors } from "@/lib/project-schema";
import type { SkillOptions } from "@/lib/skill-options";

export type ProjectSkillRowValue = {
  skillCategoryId: string;
  skillId: string;
  skillVersionId: string;
  skillNameInput: string;
};

type ProjectSkillRowProps = {
  index: number;
  row: ProjectSkillRowValue;
  options: SkillOptions;
  fieldErrors?: ProjectSkillRowFieldErrors;
  onChange: (patch: Partial<ProjectSkillRowValue>) => void;
  onRemove: () => void;
};

// 新規追加用の1行コンパクトフォーム(EDT005の使用スキル)。EDT003のSkillRowと
// 同じ入力形式だが、習熟度に相当する項目はEDT005にはない。
export function ProjectSkillRow({
  index,
  row,
  options,
  fieldErrors,
  onChange,
  onRemove,
}: ProjectSkillRowProps) {
  const categorySkills = options.skills.filter(
    (s) => String(s.skillCategoryId) === row.skillCategoryId,
  );
  const selectedSkill = options.skills.find((s) => String(s.id) === row.skillId);
  const skillVersions = selectedSkill
    ? options.versions.filter(
        (v) =>
          v.skillId === selectedSkill.id &&
          (v.isActive || String(v.id) === row.skillVersionId),
      )
    : [];
  const datalistId = `project-skill-name-options-${index}`;
  const namePrefix = `skills.${index}`;

  function handleSkillNameInput(text: string) {
    const matched = categorySkills.find((s) => s.skillName === text);
    onChange({
      skillNameInput: text,
      skillId: matched ? String(matched.id) : "",
      skillVersionId: matched?.hasVersion ? row.skillVersionId : "",
    });
  }

  const errors = [
    fieldErrors?.skillCategoryId,
    fieldErrors?.skillId,
    fieldErrors?.skillVersionId,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-1 rounded border p-2">
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_1.3fr_1fr_auto]">
        <select
          aria-label="カテゴリ"
          value={row.skillCategoryId}
          onChange={(e) =>
            onChange({
              skillCategoryId: e.target.value,
              skillId: "",
              skillNameInput: "",
              skillVersionId: "",
            })
          }
          className="rounded border px-2 py-2 text-sm"
        >
          <option value="">カテゴリ *</option>
          {options.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.skillCategoryName}
            </option>
          ))}
        </select>
        {/* controlled <select> はaction完了後の自動リセットで復元されない
            ケースがあるため、送信値は非表示inputで別途保持する。 */}
        <input
          type="hidden"
          name={`${namePrefix}.skillCategoryId`}
          value={row.skillCategoryId}
        />

        <span className="inline-flex">
          <ClearableInput
            list={datalistId}
            aria-label="スキル名"
            value={row.skillNameInput}
            onChange={(e) => handleSkillNameInput(e.target.value)}
            disabled={!row.skillCategoryId}
            placeholder="スキル名を選択 *"
            className="px-2 py-2 text-sm disabled:opacity-50"
          />
          <datalist id={datalistId}>
            {categorySkills.map((s) => (
              <option key={s.id} value={s.skillName} />
            ))}
          </datalist>
        </span>
        <input type="hidden" name={`${namePrefix}.skillId`} value={row.skillId} />

        <select
          aria-label="バージョン"
          value={row.skillVersionId}
          onChange={(e) => onChange({ skillVersionId: e.target.value })}
          disabled={!selectedSkill?.hasVersion}
          className="rounded border px-2 py-2 text-sm disabled:opacity-50"
        >
          <option value="">
            {selectedSkill?.hasVersion ? "バージョン *" : "バージョンなし"}
          </option>
          {skillVersions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.versionName}
            </option>
          ))}
        </select>
        <input
          type="hidden"
          name={`${namePrefix}.skillVersionId`}
          value={row.skillVersionId}
        />

        <button
          type="button"
          onClick={onRemove}
          aria-label="この行を削除"
          className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          削除
        </button>
      </div>
      {errors.map((message, i) => (
        <p key={i} className="text-sm text-red-600">
          {message}
        </p>
      ))}
    </div>
  );
}
