"use client";

import { useActionState, useEffect, useRef } from "react";

import { createOrganizationUnit } from "@/app/(authenticated)/master/organization-units/actions";
import { OrganizationUnitNodeItem } from "@/components/master/OrganizationUnitNodeItem";
import type { OrganizationUnitFormState } from "@/lib/organization-unit-schema";
import type { OrganizationUnitNode } from "@/lib/organization-unit-tree";

const initialState: OrganizationUnitFormState = { error: null };
const createDivisionAction = createOrganizationUnit.bind(null, null);

export function OrganizationUnitManager({
  tree,
}: {
  tree: OrganizationUnitNode[];
}) {
  const [state, formAction, isPending] = useActionState(
    createDivisionAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const prevStateRef = useRef(state);
  useEffect(() => {
    if (prevStateRef.current !== state) {
      prevStateRef.current = state;
      if (!state.error) formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-3 rounded border p-4"
      >
        <h2 className="text-sm font-semibold">事業部を追加</h2>
        <div className="flex gap-3">
          <input
            type="text"
            name="unitName"
            placeholder="事業部名"
            maxLength={100}
            className="flex-1 rounded border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {isPending ? "追加中..." : "事業部を追加"}
          </button>
        </div>
        {state.error ? (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : null}
      </form>

      <div className="flex flex-col gap-1">
        {tree.length === 0 ? (
          <p className="text-sm text-zinc-500">
            登録済みの組織単位はありません。
          </p>
        ) : (
          tree.map((node) => (
            <OrganizationUnitNodeItem key={node.id} node={node} depth={0} />
          ))
        )}
      </div>
    </div>
  );
}
