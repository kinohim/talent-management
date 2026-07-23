import { describe, expect, it } from "vitest";

import {
  MASKABLE_FIELD_KEYS,
  defaultPdfPreviewSettings,
  type PdfPreviewSettings,
} from "./pdf-preview-settings";

const NO_MASK = Object.fromEntries(
  MASKABLE_FIELD_KEYS.map((key) => [key, false]),
) as PdfPreviewSettings["masked"];

// 人事・営業/管理職(他人)の初期値: 経験年数以外の全項目マスク
const EXTERNAL_MASK = Object.fromEntries(
  MASKABLE_FIELD_KEYS.map((key) => [key, key !== "experience"]),
) as PdfPreviewSettings["masked"];

describe("defaultPdfPreviewSettings", () => {
  it("EMPLOYEEは実名・全項目マスクなし", () => {
    expect(
      defaultPdfPreviewSettings({
        viewerRole: "EMPLOYEE",
        isSelf: false,
        hasInitials: true,
      }),
    ).toEqual({ nameMode: "real", masked: NO_MASK });
  });

  it("HR_SALESはイニシャル・経験年数以外の全項目マスクON", () => {
    expect(
      defaultPdfPreviewSettings({
        viewerRole: "HR_SALES",
        isSelf: false,
        hasInitials: true,
      }),
    ).toEqual({ nameMode: "initial", masked: EXTERNAL_MASK });
  });

  it("MANAGERで他人の経歴書はイニシャル・経験年数以外の全項目マスクON", () => {
    expect(
      defaultPdfPreviewSettings({
        viewerRole: "MANAGER",
        isSelf: false,
        hasInitials: true,
      }),
    ).toEqual({ nameMode: "initial", masked: EXTERNAL_MASK });
  });

  it("MANAGERで自身の経歴書は実名・全項目マスクなし", () => {
    expect(
      defaultPdfPreviewSettings({
        viewerRole: "MANAGER",
        isSelf: true,
        hasInitials: true,
      }),
    ).toEqual({ nameMode: "real", masked: NO_MASK });
  });

  it("イニシャル初期値でもhasInitials=falseなら実名にフォールバックする", () => {
    expect(
      defaultPdfPreviewSettings({
        viewerRole: "HR_SALES",
        isSelf: false,
        hasInitials: false,
      }),
    ).toEqual({ nameMode: "real", masked: EXTERNAL_MASK });
  });
});
