type PillOption = {
  value: string;
  label: string;
};

type PillMultiSelectProps = {
  name: string;
  options: PillOption[];
  values: string[];
  onChange: (values: string[]) => void;
};

// 複数のチェックボックスに同じnameを持たせることで、FormData側は
// `formData.getAll(name)`でチェック済みの値をまとめて取得できる。
// controlled(values/onChange)にしているのは、検証エラーで同一画面に留まった際
// にReact DOMのフォームaction機能が非制御フィールドを自動リセットしてしまう
// 問題を避けるため(mypageのスキルセクションのSkillRowsForm.tsxで見つかった不具合と同種)。
export function PillMultiSelect({
  name,
  options,
  values,
  onChange,
}: PillMultiSelectProps) {
  function toggle(value: string) {
    onChange(
      values.includes(value)
        ? values.filter((v) => v !== value)
        : [...values, value],
    );
  }

  return (
    <div role="group" className="flex flex-wrap gap-2">
      {options.map((option) => (
        <label
          key={option.value}
          className="cursor-pointer rounded-full border border-surface-border px-4 py-1 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
        >
          <input
            type="checkbox"
            name={name}
            value={option.value}
            checked={values.includes(option.value)}
            onChange={() => toggle(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
