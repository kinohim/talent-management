"use client";

import { useActionState } from "react";

import { loginAction, type LoginFormState } from "@/app/login/actions";

const initialLoginFormState: LoginFormState = { error: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialLoginFormState,
  );

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="employeeId" className="text-sm font-medium">
          社員ID
        </label>
        <input
          id="employeeId"
          name="employeeId"
          type="text"
          required
          autoComplete="off"
          className="rounded border px-3 py-2"
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-zinc-900 hover:bg-zinc-700 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:hover:bg-zinc-300 dark:text-zinc-900"
      >
        {isPending ? "ログイン中..." : "ログイン"}
      </button>
    </form>
  );
}
