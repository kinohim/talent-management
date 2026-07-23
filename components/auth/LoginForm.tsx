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
    <form action={formAction} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="employeeId" className="text-sm font-medium text-brand">
          社員ID
        </label>
        <input
          id="employeeId"
          name="employeeId"
          type="text"
          required
          autoComplete="off"
          className="rounded-full border border-surface-border px-4 py-3 text-base"
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
        className="rounded-full bg-primary px-6 py-3 text-base text-primary-foreground hover:bg-primary-dark disabled:opacity-50"
      >
        {isPending ? "ログイン中..." : "ログイン"}
      </button>
    </form>
  );
}
