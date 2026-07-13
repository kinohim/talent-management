"use client";

import { useActionState, useState } from "react";

import { saveSkill } from "@/app/(authenticated)/master/skills/actions";
import { CategorySelectField, type CategoryOption } from "@/components/master/CategorySelectField";
import { SkillMasterRow, type SkillMasterSkill } from "@/components/master/SkillMasterRow";
import { VersionTagEditor } from "@/components/master/VersionTagEditor";
import type { SkillMasterFormState } from "@/lib/skill-master-schema";

type SkillMasterManagerProps = {
  categories: CategoryOption[];
  skills: (SkillMasterSkill & { categoryName: string })[];
};

const initialState: SkillMasterFormState = { error: null };
const createSkillAction = saveSkill.bind(null, null);

export function SkillMasterManager({ categories, skills }: SkillMasterManagerProps) {
  const [state, formAction, isPending] = useActionState(createSkillAction, initialState);
  const [resetKey, setResetKey] = useState(0);
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (!state.error) setResetKey((key) => key + 1);
  }

  const groupsByCategory = new Map<
    string,
    (SkillMasterSkill & { categoryName: string })[]
  >();
  for (const skill of skills) {
    const group = groupsByCategory.get(skill.categoryName) ?? [];
    group.push(skill);
    groupsByCategory.set(skill.categoryName, group);
  }
  const groups = [...groupsByCategory.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "ja"),
  );

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <form action={formAction} className="flex flex-col gap-3 rounded border p-4">
        <h2 className="text-sm font-semibold">スキルを追加</h2>
        <CategorySelectField key={`category-${resetKey}`} categories={categories} />
        <input
          key={`skill-name-${resetKey}`}
          type="text"
          name="skillName"
          placeholder="スキル名"
          maxLength={100}
          className="rounded border px-2 py-1 text-sm"
        />
        <VersionTagEditor key={`versions-${resetKey}`} name="versionNames" />
        {state.error ? (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {isPending ? "追加中..." : "スキルを追加"}
        </button>
      </form>

      <div className="flex flex-col gap-6">
        {groups.length === 0 ? (
          <p className="text-sm text-zinc-500">登録済みのスキルはありません。</p>
        ) : (
          groups.map(([categoryName, categorySkills]) => (
            <div key={categoryName} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">{categoryName}</h3>
              <div className="flex flex-col gap-2">
                {categorySkills
                  .slice()
                  .sort((a, b) => a.skillName.localeCompare(b.skillName, "ja"))
                  .map((skill) => (
                    <SkillMasterRow key={skill.id} skill={skill} categories={categories} />
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
