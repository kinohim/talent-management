"use client";

import { useState } from "react";

export type CategoryOption = { id: number; name: string };

type CategorySelectFieldProps = {
  categories: CategoryOption[];
  defaultCategoryId?: number;
};

// master-skills/master-certifications共通の「カテゴリ: 選択(既存)/新規入力」フィールド。
// categoryId="new"を選ぶとnewCategoryName入力欄が現れる。
export function CategorySelectField({
  categories,
  defaultCategoryId,
}: CategorySelectFieldProps) {
  const [categoryId, setCategoryId] = useState(
    defaultCategoryId != null ? String(defaultCategoryId) : "",
  );

  return (
    <div className="flex flex-col gap-2">
      <select
        name="categoryId"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="rounded border px-2 py-1 text-sm"
      >
        <option value="" disabled>
          カテゴリを選択
        </option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
        <option value="new">+ 新規カテゴリを作成</option>
      </select>
      {categoryId === "new" ? (
        <input
          type="text"
          name="newCategoryName"
          placeholder="新規カテゴリ名"
          maxLength={100}
          className="rounded border px-2 py-1 text-sm"
        />
      ) : null}
    </div>
  );
}
