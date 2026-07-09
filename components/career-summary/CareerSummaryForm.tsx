"use client";

import { useActionState, useState } from "react";

import {
  saveCareerSummary,
  type CareerSummaryFormState,
} from "@/app/(authenticated)/career-summary/actions";

const MAX_LENGTH = 1000;

type CareerSummaryFormProps = {
  defaultValues: {
    careerSummary: string;
    selfPr: string;
  };
};

const initialCareerSummaryFormState: CareerSummaryFormState = {
  fieldErrors: {},
  formError: null,
};

export function CareerSummaryForm({ defaultValues }: CareerSummaryFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveCareerSummary,
    initialCareerSummaryFormState,
  );
  const [careerSummary, setCareerSummary] = useState(
    defaultValues.careerSummary,
  );
  const [selfPr, setSelfPr] = useState(defaultValues.selfPr);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <label htmlFor="careerSummary" className="text-sm font-medium">
            経歴概要
          </label>
          <span className="text-xs text-zinc-500">
            {careerSummary.length}/{MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="careerSummary"
          name="careerSummary"
          rows={6}
          maxLength={MAX_LENGTH}
          value={careerSummary}
          onChange={(event) => setCareerSummary(event.target.value)}
          className="rounded border px-3 py-2"
        />
        {state.fieldErrors.careerSummary ? (
          <p className="text-sm text-red-600">
            {state.fieldErrors.careerSummary}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <label htmlFor="selfPr" className="text-sm font-medium">
            自己PR
          </label>
          <span className="text-xs text-zinc-500">
            {selfPr.length}/{MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="selfPr"
          name="selfPr"
          rows={6}
          maxLength={MAX_LENGTH}
          value={selfPr}
          onChange={(event) => setSelfPr(event.target.value)}
          className="rounded border px-3 py-2"
        />
        {state.fieldErrors.selfPr ? (
          <p className="text-sm text-red-600">{state.fieldErrors.selfPr}</p>
        ) : null}
      </div>

      {state.formError ? (
        <p role="alert" className="text-sm text-red-600">
          {state.formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-zinc-900 px-6 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {isPending ? "保存中..." : "保存"}
      </button>
    </form>
  );
}
