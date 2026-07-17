// pdf-preview(PDF出力プレビュー)の出力設定(氏名表記・項目別マスク)の
// ロール別初期値(docs/screens.md pdf-preview)。設定は保持せず、画面を開く
// たびに必ず初期値マトリクスを適用する(ユーザー操作は画面表示中のみ有効)。

import type { UserRole } from "@/generated/prisma/client";

// マスク可能な項目(基本情報6+最終学歴5)。氏名は表示兼入力フィールド+
// 実名/イニシャルの選択(nameMode)側で制御する
export const MASKABLE_FIELD_KEYS = [
  "kana",
  "birthDate",
  "gender",
  "organization",
  "nearestStation",
  "experience",
  "schoolType",
  "schoolName",
  "departmentName",
  "graduationYearMonth",
  "graduationStatus",
] as const;

export type MaskableFieldKey = (typeof MASKABLE_FIELD_KEYS)[number];

// 氏名の選択(実名/イニシャル)。手修正した氏名の文字列は保持しない
// (別の社員のプレビューへ誤った氏名が引き継がれるのを防ぐ)ため、
// 保持対象は選択状態のみとする
export type PrintNameMode = "real" | "initial";

export type PdfPreviewSettings = {
  nameMode: PrintNameMode;
  masked: Record<MaskableFieldKey, boolean>;
};

function noMask(): PdfPreviewSettings["masked"] {
  return Object.fromEntries(
    MASKABLE_FIELD_KEYS.map((key) => [key, false]),
  ) as PdfPreviewSettings["masked"];
}

// ロール・対象別の初期値マトリクス(docs/screens.md pdf-preview)。
// 一般社員(本画面を開けるのは本人のみ)と管理職の自身分は実名・マスクなし。
// 人事・営業/管理職が他人を開いた場合はイニシャル+経験年数以外の全項目
// マスクON(社外提出が主用途のため最も安全側に倒し、提案時に必要な経験年数
// だけ表示する)。カナ不備でイニシャル生成不可(hasInitials=false)なら実名に
// フォールバックする(選択肢の非活性化はUI側)。
export function defaultPdfPreviewSettings(params: {
  viewerRole: UserRole;
  isSelf: boolean;
  hasInitials: boolean;
}): PdfPreviewSettings {
  const external =
    params.viewerRole === "HR_SALES" ||
    (params.viewerRole === "MANAGER" && !params.isSelf);
  if (!external) {
    return { nameMode: "real", masked: noMask() };
  }
  const masked = noMask();
  for (const key of MASKABLE_FIELD_KEYS) {
    if (key !== "experience") masked[key] = true;
  }
  return {
    nameMode: params.hasInitials ? "initial" : "real",
    masked,
  };
}
