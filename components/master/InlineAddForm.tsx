"use client";

import { useActionState, useState } from "react";

type FormState = { error: string | null };

type InlineAddFormProps = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  // 送信するinputのname属性(siteName / projectRoleName / unitName / categoryName等)
  name: string;
  placeholder: string;
  submitLabel: string;
  maxLength?: number;
};

// マスタ管理画面共通の1行コンパクト追加フォーム。テキスト1つ+追加ボタンの
// 構成で、各画面の最上部に常時表示する。成功時のリセットは各Managerに
// 散らばっていた「resetKey + レンダー中のprevState比較」パターンをここに集約。
export function InlineAddForm({
  action,
  name,
  placeholder,
  submitLabel,
  maxLength = 100,
}: InlineAddFormProps) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [resetKey, setResetKey] = useState(0);
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (!state.error) setResetKey((key) => key + 1);
  }

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <input
          key={resetKey}
          type="text"
          name={name}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-64 rounded border px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-zinc-900 hover:bg-zinc-700 px-3 py-1 text-xs text-white disabled:opacity-50 dark:bg-zinc-100 dark:hover:bg-zinc-300 dark:text-zinc-900"
        >
          {isPending ? "追加中..." : submitLabel}
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
