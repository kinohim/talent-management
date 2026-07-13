"use client";

import { useState } from "react";

export type ConditionOption = { id: number; name: string };
export type ConditionMatchMode = "AND" | "OR";

type ConditionTagFilterProps = {
  label: string;
  options: ConditionOption[];
  selected: ConditionOption[];
  onSelectedChange: (selected: ConditionOption[]) => void;
  mode: ConditionMatchMode;
  onModeChange: (mode: ConditionMatchMode) => void;
};

// REF002のスキル条件/取得資格条件: マスタからの複数選択+サジェスト+AND/OR切替。
// AND/ORの説明はマウスオーバー時のみtitleツールチップで表示する(常時表示しない)。
export function ConditionTagFilter({
  label,
  options,
  selected,
  onSelectedChange,
  mode,
  onModeChange,
}: ConditionTagFilterProps) {
  const [inputValue, setInputValue] = useState("");
  const datalistId = `${label}-options`;

  function addFromInput() {
    const trimmed = inputValue.trim();
    const matched = options.find((option) => option.name === trimmed);
    if (matched && !selected.some((item) => item.id === matched.id)) {
      onSelectedChange([...selected, matched]);
    }
    setInputValue("");
  }

  function remove(id: number) {
    onSelectedChange(selected.filter((item) => item.id !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
        <button
          type="button"
          onClick={() => onModeChange(mode === "AND" ? "OR" : "AND")}
          title="AND：選択した全ての条件を持つ人を検索／OR：いずれか1つでも持つ人を検索"
          className="rounded-full border px-3 py-0.5 text-xs"
        >
          {mode}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {selected.map((item) => (
          <span
            key={item.id}
            className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs"
          >
            {item.name}
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="text-zinc-500 hover:text-red-600"
              aria-label={`${item.name}を削除`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          list={datalistId}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addFromInput();
            }
          }}
          placeholder={`${label}を選択`}
          className="rounded border px-2 py-1 text-sm"
        />
        <datalist id={datalistId}>
          {options.map((option) => (
            <option key={option.id} value={option.name} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={addFromInput}
          className="rounded border px-3 py-1 text-xs"
        >
          追加
        </button>
      </div>
    </div>
  );
}
