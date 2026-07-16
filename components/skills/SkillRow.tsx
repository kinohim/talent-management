"use client";

import { ClearableInput } from "@/components/ui/ClearableInput";
import type { SkillOptions } from "@/lib/skill-options";
import type { SkillRowFieldErrors } from "@/lib/skill-schema";

export type SkillRowValue = {
  skillCategoryId: string;
  skillId: string;
  skillNameInput: string;
  skillVersionId: string;
  skillLevel: string;
};

type SkillRowProps = {
  index: number;
  row: SkillRowValue;
  options: SkillOptions;
  fieldErrors?: SkillRowFieldErrors;
  onChange: (patch: Partial<SkillRowValue>) => void;
  onRemove: () => void;
};

// 新規追加用の1行コンパクトフォーム(mypageのスキルセクション)。カテゴリ/スキル名/バージョン/
// 習熟度/削除を1行に収める(登録済み分はSkillRowsFormがタグ表示する)。
export function SkillRow({
  index,
  row,
  options,
  fieldErrors,
  onChange,
  onRemove,
}: SkillRowProps) {
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
  const datalistId = `skill-name-options-${index}`;
  const namePrefix = `items.${index}`;

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
    fieldErrors?.skillLevel,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-1 rounded border p-2">
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_1.3fr_1fr_1fr_auto]">
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
        {/* Reactのフォームaction機能はaction完了後に非制御フィールドを自動
            リセットするが、controlled <select> の復元がその対象外になる
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

        <select
          aria-label="習熟度"
          value={row.skillLevel}
          onChange={(e) => onChange({ skillLevel: e.target.value })}
          className="rounded border px-2 py-2 text-sm"
        >
          <option value="">習熟度 *</option>
          <option value="EXPERT">◎ 得意</option>
          <option value="EXPERIENCED">○ 経験あり</option>
          <option value="BASIC">△ 基礎知識</option>
        </select>
        <input
          type="hidden"
          name={`${namePrefix}.skillLevel`}
          value={row.skillLevel}
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
