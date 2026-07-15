"use client";

import { useActionState, useState } from "react";

import { createSkillCategory, saveSkill } from "@/app/(authenticated)/master/skills/actions";
import type { CategoryOption } from "@/components/master/CategorySelectField";
import { InlineAddForm } from "@/components/master/InlineAddForm";
import { ClearableInput } from "@/components/ui/ClearableInput";
import { SkillMasterRow, type SkillMasterSkill } from "@/components/master/SkillMasterRow";
import { VersionTagEditor } from "@/components/master/VersionTagEditor";
import type { SkillMasterFormState } from "@/lib/skill-master-schema";

type SkillMasterManagerProps = {
  categories: CategoryOption[];
  skills: (SkillMasterSkill & { categoryName: string })[];
};

const initialState: SkillMasterFormState = { error: null };
const createSkillAction = saveSkill.bind(null, null);

// カテゴリ確定済みのスキル追加フォーム(カテゴリ見出しの[+ 追加]から展開)。
// categoryIdはhiddenで送るため、既存のsaveSkill(existingカテゴリモード)を
// そのまま利用できる。
function CategorySkillAddForm({
  categoryId,
  onClose,
}: {
  categoryId: number;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(createSkillAction, initialState);
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (!state.error) onClose();
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded border border-dashed p-3">
      <input type="hidden" name="categoryId" value={categoryId} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="skillName"
          placeholder="スキル名"
          maxLength={100}
          autoFocus
          className="w-64 rounded border px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded border px-3 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          {isPending ? "追加中..." : "追加"}
        </button>
        <button type="button" onClick={onClose} className="text-xs text-zinc-500">
          キャンセル
        </button>
      </div>
      <VersionTagEditor name="versionNames" />
      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function SkillCategorySection({
  category,
  skills,
  categories,
  forceExpanded = false,
}: {
  category: CategoryOption;
  skills: (SkillMasterSkill & { categoryName: string })[];
  categories: CategoryOption[];
  // 絞り込み中はヒットしたスキルを確認できるよう常に展開する
  forceExpanded?: boolean;
}) {
  const [manuallyExpanded, setManuallyExpanded] = useState(false);
  const expanded = forceExpanded || manuallyExpanded;
  const setExpanded = setManuallyExpanded;
  const [showAddForm, setShowAddForm] = useState(false);

  const sortedSkills = skills
    .slice()
    .sort((a, b) => a.skillName.localeCompare(b.skillName, "ja"));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2">
        <div className="flex items-center gap-2">
          {sortedSkills.length > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? "カテゴリを閉じる" : "カテゴリを開く"}
              className="w-5 text-center text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {expanded ? "▼" : "▶"}
            </button>
          ) : (
            <span aria-hidden="true" className="w-5" />
          )}
          <h3 className="text-sm font-semibold">
            {category.name}
            <span className="ml-2 text-xs font-normal text-zinc-400">
              {sortedSkills.length}件
            </span>
          </h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(true);
            setExpanded(true);
          }}
          className="rounded border px-2 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          + 追加
        </button>
      </div>

      {showAddForm ? (
        <div className="pl-7">
          <CategorySkillAddForm
            categoryId={category.id}
            onClose={() => setShowAddForm(false)}
          />
        </div>
      ) : null}

      {expanded && sortedSkills.length > 0 ? (
        <div className="flex flex-col gap-2 pl-7">
          {sortedSkills.map((skill) => (
            <SkillMasterRow key={skill.id} skill={skill} categories={categories} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SkillMasterManager({ categories, skills }: SkillMasterManagerProps) {
  // スキル名のあいまい絞り込み(クライアント側の部分一致・大文字小文字無視)。
  // 絞り込み中はヒットしないカテゴリを非表示にし、ヒットしたカテゴリは展開する
  const [filter, setFilter] = useState("");
  const normalizedFilter = filter.trim().toLowerCase();
  const filteredSkills = normalizedFilter
    ? skills.filter((skill) =>
        skill.skillName.toLowerCase().includes(normalizedFilter),
      )
    : skills;

  const sortedCategories = categories
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ja"))
    .filter(
      (category) =>
        normalizedFilter === "" ||
        filteredSkills.some((skill) => skill.categoryId === category.id),
    );

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {/* カテゴリの追加フィールドは最上部に常時表示。スキル自体の追加は
          各カテゴリ見出しの[+ 追加]から行う */}
      <InlineAddForm
        action={createSkillCategory}
        name="categoryName"
        placeholder="カテゴリ名"
        submitLabel="カテゴリを追加"
      />

      <div className="flex max-w-sm flex-col gap-1">
        <label className="text-sm font-medium">絞り込み</label>
        <ClearableInput
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="スキル名で絞り込み"
          className="text-sm"
        />
      </div>

      <div className="flex flex-col gap-3">
        {sortedCategories.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {normalizedFilter
              ? "絞り込みに一致するスキルはありません。"
              : "登録済みのカテゴリはありません。"}
          </p>
        ) : (
          sortedCategories.map((category) => (
            <SkillCategorySection
              key={category.id}
              category={category}
              skills={filteredSkills.filter(
                (skill) => skill.categoryId === category.id,
              )}
              categories={categories}
              forceExpanded={normalizedFilter !== ""}
            />
          ))
        )}
      </div>
    </div>
  );
}
