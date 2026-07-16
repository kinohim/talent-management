"use client";

import { useRef, useState } from "react";

type NativeInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "className" | "min" | "max"
>;

type DateFieldBaseProps = NativeInputProps & {
  className?: string;
  min?: string;
  max?: string;
  // 空の状態でカレンダーボタンをクリックしたときに自動セットする値
  // (例: 卒業年月に生年月日から予想した年月を初期表示する)
  defaultWhenEmpty?: string;
};

// ネイティブ日付系inputの共通仕様(docs/screens.md 共通仕様):
// - min/maxを必ず付与し年を4桁までに制限する(6桁入力の防止。maxがあると
//   ブラウザは年の5桁目を受け付けず、4桁入力後に月へ自動移動する)
// - ネイティブのカレンダーインジケータは非表示にし、×の左に自前の
//   カレンダーボタン(showPicker)を置く(×とピッカー起動領域の重なり防止)
// - フィールド内×(右端)で値をクリアできる
// - defaultWhenEmptyで「空のままカレンダーボタンを押した瞬間の初期値」を
//   差し込める(フォーカスや×クリアでは差し込まない。クリアで空に戻せること)
function DateFieldBase({
  type,
  fallbackMin,
  fallbackMax,
  className = "",
  min,
  max,
  defaultWhenEmpty,
  onChange,
  ...rest
}: DateFieldBaseProps & {
  type: "date" | "month";
  fallbackMin: string;
  fallbackMax: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasValue, setHasValue] = useState(
    Boolean(rest.value ?? rest.defaultValue),
  );
  const controlled = rest.value !== undefined;
  const showClear = controlled ? String(rest.value) !== "" : hasValue;

  // ネイティブsetter経由で値を書き、Reactの制御stateにも変更を伝える
  function setNativeValue(value: string) {
    const input = inputRef.current;
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    setHasValue(value !== "");
  }

  return (
    <span className="relative inline-flex w-full">
      <input
        ref={inputRef}
        type={type}
        min={min ?? fallbackMin}
        max={max ?? fallbackMax}
        onChange={(e) => {
          setHasValue(e.currentTarget.value !== "");
          onChange?.(e);
        }}
        className={`w-full rounded border px-3 py-2 pr-14 [&::-webkit-calendar-picker-indicator]:hidden ${className}`}
        {...rest}
      />
      {!rest.disabled && !rest.readOnly ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label="カレンダーを開く"
          onClick={() => {
            const input = inputRef.current;
            if (!input) return;
            if (defaultWhenEmpty && input.value === "") {
              setNativeValue(defaultWhenEmpty);
            }
            try {
              input.showPicker();
            } catch {
              input.focus();
            }
          }}
          className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full px-0.5 text-zinc-400 hover:text-zinc-600"
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" />
            <path d="M1.5 6h13M5 1v3M11 1v3" />
          </svg>
        </button>
      ) : null}
      {showClear && !rest.disabled && !rest.readOnly && !rest.required ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label="入力をクリア"
          onClick={() => {
            setNativeValue("");
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-1 text-zinc-400 hover:text-zinc-600"
        >
          ×
        </button>
      ) : null}
    </span>
  );
}

export function DateField(props: DateFieldBaseProps) {
  return (
    <DateFieldBase
      type="date"
      fallbackMin="1900-01-01"
      fallbackMax="9999-12-31"
      {...props}
    />
  );
}

export function MonthField(props: DateFieldBaseProps) {
  return (
    <DateFieldBase
      type="month"
      fallbackMin="1900-01"
      fallbackMax="9999-12"
      {...props}
    />
  );
}
