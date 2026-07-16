"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  saveCareerSummary,
  type CareerSummaryFormState,
} from "@/app/(authenticated)/mypage/actions";
import { AiGeneratePanel } from "@/components/career-summary/AiGeneratePanel";
import { useSectionEdit } from "@/components/my-resume/EditableSection";

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

// 各項目は「登録用フィールド | ←ボタン | AI生成フォーム」の横並び(md以上)。
// ←ボタンでAI生成結果を登録用フィールドへ上書きコピーする。
function FieldWithAiPanel({
  id,
  label,
  value,
  onChange,
  fieldError,
  aiValue,
  onAiValueChange,
}: {
  id: "careerSummary" | "selfPr";
  label: string;
  value: string;
  onChange: (text: string) => void;
  fieldError: string | undefined;
  aiValue: string;
  onAiValueChange: (text: string) => void;
}) {
  return (
    // 登録用フォームとAI生成パネルは同じ枠スタイル・同じ高さ(グリッドのstretch)で
    // 左右対称に揃える。textareaはユーザーがリサイズできるようflex-1を付けない
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr]">
      <div className="flex h-full flex-col gap-2 rounded border p-3">
        <div className="flex items-baseline justify-between">
          <label htmlFor={id} className="text-sm font-medium">
            {label}
          </label>
          <span className="text-xs text-zinc-500">
            {value.length}/{MAX_LENGTH}
          </span>
        </div>
        {/* flex-1のwrapperで初期表示はカードを埋めつつ、textarea自体は
            リサイズ可能に保つ(textareaに直接flex-1を付けると高さが固定される)。
            min-hはrows=6相当(6行×24px+py-2+border=162px)。textareaを初期より
            小さくしてもwrapperが高さを保ち、外枠が初期サイズより縮まない */}
        <div className="min-h-[10.125rem] flex-1">
          <textarea
            id={id}
            name={id}
            rows={6}
            maxLength={MAX_LENGTH}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="block h-full w-full rounded border px-3 py-2"
          />
        </div>
        {fieldError ? <p className="text-sm text-red-600">{fieldError}</p> : null}
      </div>

      <button
        type="button"
        onClick={() => onChange(aiValue)}
        disabled={aiValue === ""}
        title={`${label}の入力欄へ上書きコピー`}
        aria-label={`AI生成結果を${label}の入力欄へコピー`}
        className="self-center rounded border px-3 py-1.5 text-sm disabled:opacity-50 md:mt-6 hover:bg-zinc-50 dark:hover:bg-zinc-800"
      >
        ←
      </button>

      <AiGeneratePanel
        target={id}
        label={label}
        value={aiValue}
        onValueChange={onAiValueChange}
      />
    </div>
  );
}

export function CareerSummaryForm({ defaultValues }: CareerSummaryFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveCareerSummary,
    initialCareerSummaryFormState,
  );
  const [careerSummary, setCareerSummary] = useState(
    defaultValues.careerSummary,
  );
  const [selfPr, setSelfPr] = useState(defaultValues.selfPr);
  const [aiCareerSummary, setAiCareerSummary] = useState("");
  const [aiSelfPr, setAiSelfPr] = useState("");

  // セクション編集(私の経歴書)では保存成功をEditableSectionへ通知して
  // 編集モードを解除する。Contextが無い文脈では何もしない。
  const sectionEdit = useSectionEdit();
  const prevStateRef = useRef(state);
  useEffect(() => {
    if (prevStateRef.current !== state) {
      prevStateRef.current = state;
      if (state.saved) sectionEdit?.onSaved();
    }
  }, [state, sectionEdit]);
  // セクション編集ではヘッダの保存ボタン(EditableSection)に送信中状態を反映する
  useEffect(() => {
    sectionEdit?.setPending(isPending);
  }, [isPending, sectionEdit]);

  return (
    <form
      id={sectionEdit?.formId}
      action={formAction}
      className="flex flex-col gap-6"
    >
      <FieldWithAiPanel
        id="careerSummary"
        label="経歴概要"
        value={careerSummary}
        onChange={setCareerSummary}
        fieldError={state.fieldErrors.careerSummary}
        aiValue={aiCareerSummary}
        onAiValueChange={setAiCareerSummary}
      />

      <FieldWithAiPanel
        id="selfPr"
        label="自己PR"
        value={selfPr}
        onChange={setSelfPr}
        fieldError={state.fieldErrors.selfPr}
        aiValue={aiSelfPr}
        onAiValueChange={setAiSelfPr}
      />

      {state.formError ? (
        <p role="alert" className="text-sm text-red-600">
          {state.formError}
        </p>
      ) : null}

      {/* セクション編集では保存ボタンはEditableSectionのヘッダ側に出す */}
      {sectionEdit ? null : (
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded bg-zinc-900 px-6 py-2 text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {isPending ? "保存中..." : "保存"}
        </button>
      )}
    </form>
  );
}
