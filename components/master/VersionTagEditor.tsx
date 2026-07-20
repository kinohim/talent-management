"use client";

import { useState } from "react";

type VersionTagEditorProps = {
  name: string;
  initialValues?: string[];
};

// master-skills「バージョン: タグ複数入力」用の追加/削除UI。タグはローカルstateで
// 保持し、同名`name`の隠しinputを複数レンダーして`FormData.getAll(name)`で
// 一括回収できるようにする(indexed row方式より単純)。
export function VersionTagEditor({ name, initialValues = [] }: VersionTagEditorProps) {
  const [tags, setTags] = useState<string[]>(initialValues);
  const [inputValue, setInputValue] = useState("");

  function addTag() {
    const trimmed = inputValue.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setInputValue("");
      return;
    }
    setTags((prev) => [...prev, trimmed]);
    setInputValue("");
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs"
          >
            <input type="hidden" name={name} value={tag} />
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-zinc-500 hover:text-red-600"
              aria-label={`${tag}を削除`}
            >
              ×
            </button>
          </span>
        ))}
        {tags.length === 0 ? (
          <span className="text-xs text-zinc-500">バージョン管理なし</span>
        ) : null}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="バージョン名を入力してEnter"
          maxLength={50}
          className="rounded border px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={addTag}
          className="rounded border px-3 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          追加
        </button>
      </div>
    </div>
  );
}
