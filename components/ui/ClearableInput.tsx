"use client";

import { useRef, useState } from "react";

type ClearableInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "className"
> & {
  type?: "text" | "search" | "number";
  className?: string;
};

// フィールド内右端に×(全消去)を持つテキスト入力。値があるときのみ×を表示する。
// 制御(value)・非制御(defaultValue)のどちらでも使える(共通仕様:
// 入力フィールドは一律フィールド内クリア可能とする)。
export function ClearableInput({
  type = "text",
  className = "",
  onChange,
  ...rest
}: ClearableInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // 非制御時にも×の表示/非表示を追随させるためのローカル状態
  const [hasValue, setHasValue] = useState(
    Boolean(rest.value ?? rest.defaultValue),
  );
  const controlled = rest.value !== undefined;
  const showClear = controlled ? String(rest.value) !== "" : hasValue;
  // classNameでpx-*/py-*が指定されたら既定のパディングを外す
  // (Tailwindは同一プロパティのクラス併記だと出力順で勝敗が決まり不安定なため)
  const defaultPx = /(^|\s)px-/.test(className) ? "" : "px-3";
  const defaultPy = /(^|\s)py-/.test(className) ? "" : "py-2";

  function clear() {
    const input = inputRef.current;
    if (!input) return;
    // Reactの制御inputにも変更を伝えるためネイティブsetterでイベントを発火する
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, "");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
    setHasValue(false);
  }

  return (
    <span className="relative inline-flex w-full">
      <input
        ref={inputRef}
        type={type}
        onChange={(e) => {
          setHasValue(e.currentTarget.value !== "");
          onChange?.(e);
        }}
        className={`w-full rounded border ${defaultPx} ${defaultPy} pr-8 ${className}`}
        {...rest}
      />
      {showClear && !rest.disabled && !rest.readOnly ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label="入力をクリア"
          onClick={clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-1 text-zinc-400 hover:text-zinc-600"
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
