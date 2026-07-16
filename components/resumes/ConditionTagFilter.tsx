"use client";

import { useState } from "react";

import { ClearableInput } from "@/components/ui/ClearableInput";

export type ConditionOption = { id: number; name: string };
export type ConditionMatchMode = "AND" | "OR";

type ConditionTagFilterProps = {
  label: string;
  options: ConditionOption[];
  selected: ConditionOption[];
  onSelectedChange: (selected: ConditionOption[]) => void;
  // mode/onModeChange未指定の場合はAND/OR選択を表示しない(現場条件などOR固定の用途)
  mode?: ConditionMatchMode;
  onModeChange?: (mode: ConditionMatchMode) => void;
};

// resume-listのスキル条件/取得資格条件/現場条件: マスタからの複数選択+サジェスト。
// AND/ORは表示切替トグルではなくラジオで明示的に選択する。
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
      <span className="text-sm font-medium">{label}</span>

      {mode !== undefined && onModeChange ? (
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name={`${label}-mode`}
              checked={mode === "OR"}
              onChange={() => onModeChange("OR")}
            />
            いずれか含む(OR)
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name={`${label}-mode`}
              checked={mode === "AND"}
              onChange={() => onModeChange("AND")}
            />
            すべて含む(AND)
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 empty:hidden">
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
        <span className="inline-flex w-full max-w-56">
          <ClearableInput
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
            className="px-2 py-1 text-sm"
          />
        </span>
        <datalist id={datalistId}>
          {options.map((option) => (
            <option key={option.id} value={option.name} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={addFromInput}
          className="rounded border px-3 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          追加
        </button>
      </div>
    </div>
  );
}
