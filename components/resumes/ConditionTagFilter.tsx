"use client";

import { useEffect, useRef, useState } from "react";

export type ConditionOption = { id: number; name: string };
export type ConditionMatchMode = "AND" | "OR";

type ConditionTagFilterProps = {
  label: string;
  placeholder: string;
  options: ConditionOption[];
  selected: ConditionOption[];
  onSelectedChange: (selected: ConditionOption[]) => void;
  // mode/onModeChange未指定の場合はAND/OR選択を表示しない(現場条件などOR固定の用途)
  mode?: ConditionMatchMode;
  onModeChange?: (mode: ConditionMatchMode) => void;
};

// resume-listのスキル条件/取得資格条件: マスタからの複数選択をチェックボックス付き
// ドロップダウンで行う。閉時はボタン内に選択済み項目を「、」区切りで表示する。
// AND/ORはラジオでドロップダウンの直下に明示的に選択する。
export function ConditionTagFilter({
  label,
  placeholder,
  options,
  selected,
  onSelectedChange,
  mode,
  onModeChange,
}: ConditionTagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (fieldRef.current && !fieldRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  function toggle(option: ConditionOption) {
    const exists = selected.some((item) => item.id === option.id);
    onSelectedChange(
      exists
        ? selected.filter((item) => item.id !== option.id)
        : [...selected, option],
    );
  }

  const selectedLabel = selected.map((item) => item.name).join("、");

  return (
    <div ref={fieldRef} className="relative flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex w-full items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-left text-sm ${
          isOpen ? "border-primary" : "border-surface-border"
        }`}
      >
        <span className={`truncate ${selectedLabel ? "" : "text-foreground/40"}`}>
          {selectedLabel || placeholder}
        </span>
        <span aria-hidden="true" className="text-foreground/40">
          ⌄
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full z-10 mt-1 max-h-64 w-full overflow-y-auto rounded border border-surface-border bg-surface shadow-lg">
          {options.map((option) => {
            const checked = selected.some((item) => item.id === option.id);
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-surface-border/40 ${
                  checked ? "bg-primary/10" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(option)}
                  className="accent-primary"
                />
                {option.name}
              </label>
            );
          })}
        </div>
      )}

      {mode !== undefined && onModeChange ? (
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name={`${label}-mode`}
              checked={mode === "OR"}
              onChange={() => onModeChange("OR")}
              className="accent-primary"
            />
            いずれか含む(OR)
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name={`${label}-mode`}
              checked={mode === "AND"}
              onChange={() => onModeChange("AND")}
              className="accent-primary"
            />
            すべて含む(AND)
          </label>
        </div>
      ) : null}
    </div>
  );
}
