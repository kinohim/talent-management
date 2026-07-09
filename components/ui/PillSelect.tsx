type PillOption = {
  value: string;
  label: string;
};

type PillSelectProps = {
  name: string;
  options: PillOption[];
  defaultValue?: string;
  // value/onChangeを指定すると制御コンポーネントとして動作する。
  // React DOMのフォームaction機能は「action完了後に非制御フィールドを自動リセット
  // する」ため、保存前(検証エラーで同じ画面に留まる場合等)に選択状態が消えると
  // 都合が悪い呼び出し元(EDT003の明細行等)はこちらを使う。
  value?: string;
  onChange?: (value: string) => void;
};

export function PillSelect({
  name,
  options,
  defaultValue,
  value,
  onChange,
}: PillSelectProps) {
  const isControlled = value !== undefined;

  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {options.map((option) => (
        <label
          key={option.value}
          className="cursor-pointer rounded-full border px-4 py-1 text-sm has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white dark:has-[:checked]:border-zinc-100 dark:has-[:checked]:bg-zinc-100 dark:has-[:checked]:text-zinc-900"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            {...(isControlled
              ? {
                  checked: option.value === value,
                  onChange: () => onChange?.(option.value),
                }
              : { defaultChecked: option.value === defaultValue })}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
