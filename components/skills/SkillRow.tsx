"use client";

import { PillSelect } from "@/components/ui/PillSelect";
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

  return (
    <div className="flex flex-col gap-3 rounded border p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            カテゴリ <span className="text-red-600">*</span>
          </label>
          <select
            value={row.skillCategoryId}
            onChange={(e) =>
              onChange({
                skillCategoryId: e.target.value,
                skillId: "",
                skillNameInput: "",
                skillVersionId: "",
              })
            }
            className="rounded border px-3 py-2"
          >
            <option value="">選択してください</option>
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
          {fieldErrors?.skillCategoryId ? (
            <p className="text-sm text-red-600">{fieldErrors.skillCategoryId}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            スキル名 <span className="text-red-600">*</span>
          </label>
          <input
            list={datalistId}
            value={row.skillNameInput}
            onChange={(e) => handleSkillNameInput(e.target.value)}
            disabled={!row.skillCategoryId}
            placeholder="スキル名を選択"
            className="rounded border px-3 py-2 disabled:opacity-50"
          />
          <datalist id={datalistId}>
            {categorySkills.map((s) => (
              <option key={s.id} value={s.skillName} />
            ))}
          </datalist>
          <input type="hidden" name={`${namePrefix}.skillId`} value={row.skillId} />
          {fieldErrors?.skillId ? (
            <p className="text-sm text-red-600">{fieldErrors.skillId}</p>
          ) : null}
        </div>

        {selectedSkill?.hasVersion ? (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              バージョン <span className="text-red-600">*</span>
            </label>
            <select
              value={row.skillVersionId}
              onChange={(e) => onChange({ skillVersionId: e.target.value })}
              className="rounded border px-3 py-2"
            >
              <option value="">選択してください</option>
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
            {fieldErrors?.skillVersionId ? (
              <p className="text-sm text-red-600">{fieldErrors.skillVersionId}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            習熟度 <span className="text-red-600">*</span>
          </span>
          <PillSelect
            name={`${namePrefix}.skillLevel-display`}
            value={row.skillLevel}
            onChange={(value) => onChange({ skillLevel: value })}
            options={[
              { value: "EXPERT", label: "◎ 得意" },
              { value: "EXPERIENCED", label: "○ 経験あり" },
              { value: "BASIC", label: "△ 基礎知識" },
            ]}
          />
          <input
            type="hidden"
            name={`${namePrefix}.skillLevel`}
            value={row.skillLevel}
          />
          {fieldErrors?.skillLevel ? (
            <p className="text-sm text-red-600">{fieldErrors.skillLevel}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="self-start rounded border border-red-300 px-3 py-1 text-sm text-red-600"
        >
          削除
        </button>
      </div>
    </div>
  );
}
