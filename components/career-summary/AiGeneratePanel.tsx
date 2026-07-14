"use client";

import { useState } from "react";

import {
  buildMissingDataMessage,
  type CareerTextTarget,
  type MissingDataKind,
} from "@/lib/career-text-prompt";

const MAX_LENGTH = 1000;

// 「以後確認しない」の記憶はブラウザセッション内のみ有効(経歴概要・自己PR共通)
const SKIP_CONFIRM_STORAGE_KEY = "edt002SkipReplaceConfirm";

type AiGeneratePanelProps = {
  target: CareerTextTarget;
  label: string;
  // 生成結果は親(CareerSummaryForm)が保持する(親側の「←」ボタンで
  // 登録用フィールドへコピーするため)。
  value: string;
  onValueChange: (text: string) => void;
};

type GenerateResponse = {
  text: string;
  missingData: MissingDataKind[];
};

export function AiGeneratePanel({
  target,
  label,
  value,
  onValueChange,
}: AiGeneratePanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [missingDataMessage, setMissingDataMessage] = useState<string | null>(
    null,
  );
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [skipConfirmChecked, setSkipConfirmChecked] = useState(false);

  const outputId = `${target}AiOutput`;

  async function generate() {
    setShowReplaceConfirm(false);
    setIsGenerating(true);
    setGenerateError(null);
    setMissingDataMessage(null);
    try {
      const response = await fetch("/api/career-summary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const body = (await response.json().catch(() => null)) as
        | GenerateResponse
        | { error?: string }
        | null;
      if (!response.ok || !body || !("text" in body)) {
        setGenerateError(
          (body && "error" in body && body.error) ||
            "AI生成に失敗しました。時間をおいて再度お試しください。",
        );
        return;
      }
      onValueChange(body.text);
      setMissingDataMessage(buildMissingDataMessage(body.missingData));
    } catch {
      setGenerateError(
        "AI生成に失敗しました。通信環境をご確認のうえ再度お試しください。",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function handleGenerateClick() {
    const skipConfirm =
      sessionStorage.getItem(SKIP_CONFIRM_STORAGE_KEY) === "true";
    if (value !== "" && !skipConfirm) {
      setSkipConfirmChecked(false);
      setShowReplaceConfirm(true);
      return;
    }
    void generate();
  }

  function handleConfirmGenerate() {
    if (skipConfirmChecked) {
      sessionStorage.setItem(SKIP_CONFIRM_STORAGE_KEY, "true");
    }
    void generate();
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-dashed border-zinc-300 p-3 dark:border-zinc-600">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleGenerateClick}
          disabled={isGenerating}
          className="rounded bg-zinc-900 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {isGenerating ? "生成中..." : "AI生成"}
        </button>
        <span className="text-xs text-zinc-500">
          登録済みの経歴・スキル・資格から{label}の下書きを生成します。
        </span>
      </div>

      {showReplaceConfirm ? (
        <div className="flex flex-col gap-2 rounded border border-amber-400 bg-amber-50 p-3 text-sm dark:border-amber-600 dark:bg-amber-950">
          <p>出力フォームの内容を置き換えます。よろしいですか?</p>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={skipConfirmChecked}
              onChange={(event) => setSkipConfirmChecked(event.target.checked)}
            />
            以後このセッションでは確認しない
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmGenerate}
              className="rounded bg-zinc-900 px-4 py-1.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              生成する
            </button>
            <button
              type="button"
              onClick={() => setShowReplaceConfirm(false)}
              className="rounded border px-4 py-1.5 text-sm"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : null}

      {generateError ? (
        <p role="alert" className="text-sm text-red-600">
          {generateError}
        </p>
      ) : null}

      {missingDataMessage ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {missingDataMessage}
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <label htmlFor={outputId} className="text-xs text-zinc-500">
            AI生成結果(出力フォーム)
          </label>
          <span className="text-xs text-zinc-500">
            {value.length}/{MAX_LENGTH}
          </span>
        </div>
        <textarea
          id={outputId}
          rows={6}
          maxLength={MAX_LENGTH}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className="rounded border px-3 py-2"
        />
        <p className="text-xs text-zinc-500">
          この内容は保存されません。反映するには ←
          ボタンで入力欄へコピーしてください。
        </p>
      </div>
    </div>
  );
}
