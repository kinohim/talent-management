type PillOption = {
  value: string;
  label: string;
};

type PillSelectProps = {
  name: string;
  options: PillOption[];
  defaultValue?: string;
};

export function PillSelect({ name, options, defaultValue }: PillSelectProps) {
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
            defaultChecked={option.value === defaultValue}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
