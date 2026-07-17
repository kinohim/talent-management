"use client";

import { useState } from "react";

import {
  PdfResumeDocument,
  type PdfResumeData,
} from "@/components/pdf-preview/PdfResumeDocument";
import type {
  MaskableFieldKey,
  PdfPreviewSettings,
  PrintNameMode,
} from "@/lib/pdf-preview-settings";

type PdfPreviewClientProps = {
  data: PdfResumeData;
  // カナから生成したイニシャル(サーバー側で計算)。nullなら選択肢を非活性化
  initials: string | null;
  // ロール別の初期設定(サーバー側でdefaultPdfPreviewSettingsから算出)。
  // 設定は保持しないため、画面を開くたびに必ずこの初期値が適用される
  // (ユーザー操作はこの画面の表示中のみ有効)
  defaultSettings: PdfPreviewSettings;
};

// ダウンロードボタンとプレビュー本体。マスク・氏名表記の切り替えは
// プレビュー内の各項目右横で行う。
export function PdfPreviewClient({
  data,
  initials,
  defaultSettings,
}: PdfPreviewClientProps) {
  const [settings, setSettings] = useState(defaultSettings);

  // 氏名の手修正値(この画面限りの状態。タブ内保持はしない)。nullなら
  // 選択中のnameModeから導出した値を表示する
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const nameValue =
    nameOverride ??
    (settings.nameMode === "initial" && initials != null
      ? initials
      : data.name);

  const selectNameMode = (mode: PrintNameMode) => {
    setNameOverride(null);
    setSettings((current) => ({ ...current, nameMode: mode }));
  };

  const toggleSection = (
    keys: readonly MaskableFieldKey[],
    masked: boolean,
  ) => {
    // 基本情報の一括マスクは氏名の切替(ON=イニシャル/OFF=実名)も伴う。
    // イニシャル生成不可の社員ではnameModeを変えない(氏名はそのまま)
    const includesName = keys.includes("kana");
    if (includesName && initials != null) setNameOverride(null);
    setSettings((current) => {
      const nextMasked = { ...current.masked };
      for (const key of keys) nextMasked[key] = masked;
      const nextNameMode =
        includesName && initials != null
          ? masked
            ? ("initial" as const)
            : ("real" as const)
          : current.nameMode;
      return { ...current, nameMode: nextNameMode, masked: nextMasked };
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ダウンロードボタンは1つに統一し、右端を経歴書シート(A4幅)の右端に
          揃える(注意書きは画面名の右=PdfPreviewHeading側)。押下でブラウザの
          印刷ダイアログを開き、送信先「PDFに保存」で保存する */}
      <div className="mx-auto flex w-full max-w-[210mm] justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded border bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          ダウンロード
        </button>
      </div>

      <PdfResumeDocument
        data={data}
        initials={initials}
        settings={settings}
        nameValue={nameValue}
        onChangeNameValue={setNameOverride}
        onSelectNameMode={selectNameMode}
        onToggleMask={(key: MaskableFieldKey, masked: boolean) =>
          setSettings((current) => ({
            ...current,
            masked: { ...current.masked, [key]: masked },
          }))
        }
        onToggleSection={toggleSection}
      />
    </div>
  );
}
