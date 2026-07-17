import { describe, expect, it } from "vitest";

import { buildPdfFileName, initialsFromKana } from "./print-name";

describe("initialsFromKana", () => {
  it("「ヤマダ タロウ」(半角スペース)を「Y.T」に変換する", () => {
    expect(initialsFromKana("ヤマダ タロウ")).toBe("Y.T");
  });

  it("全角スペース区切り・前後空白付きでも変換する", () => {
    expect(initialsFromKana("サトウ　ハナコ")).toBe("S.H");
    expect(initialsFromKana("  イッパン サクラ　")).toBe("I.S");
  });

  it("濁音・半濁音(ガ→G、ザ→Z、ダ→D、バ→B、パ→P)を変換する", () => {
    expect(initialsFromKana("ガンドウ ザイマ")).toBe("G.Z");
    expect(initialsFromKana("ダテ バンドウ")).toBe("D.B");
    expect(initialsFromKana("パンダ ダイゴ")).toBe("P.D");
  });

  it("ヘボン式特殊音(シ→S、チ→C、ツ→T、フ→F、ジ→J、ヂ→J、ヅ→Z、ヲ→O、ヴ→V)を変換する", () => {
    expect(initialsFromKana("シバタ チバ")).toBe("S.C");
    expect(initialsFromKana("ツダ フクダ")).toBe("T.F");
    expect(initialsFromKana("ジンボ ヂンダ")).toBe("J.J");
    expect(initialsFromKana("ヅカ ヲノ")).toBe("Z.O");
    expect(initialsFromKana("ヴィクター ハナ")).toBe("V.H");
  });

  it("null・空文字・空白のみはnullを返す", () => {
    expect(initialsFromKana(null)).toBeNull();
    expect(initialsFromKana(undefined)).toBeNull();
    expect(initialsFromKana("")).toBeNull();
    expect(initialsFromKana("  　 ")).toBeNull();
  });

  it("スペースなし(1トークン)はnullを返す", () => {
    expect(initialsFromKana("ヤマダタロウ")).toBeNull();
  });

  it("3トークン以上はnullを返す", () => {
    expect(initialsFromKana("ヤマダ タロウ ジロウ")).toBeNull();
  });

  it("先頭が変換不可文字(ー・ッ・ン・小書き)のトークンはnullを返す", () => {
    expect(initialsFromKana("ーマダ タロウ")).toBeNull();
    expect(initialsFromKana("ヤマダ ッロウ")).toBeNull();
    expect(initialsFromKana("ンダ タロウ")).toBeNull();
    expect(initialsFromKana("ャマダ タロウ")).toBeNull();
  });
});

describe("buildPdfFileName", () => {
  it("「経歴書_<氏名欄の値>」を返す", () => {
    expect(buildPdfFileName("山田太郎")).toBe("経歴書_山田太郎");
  });

  it("イニシャル表示中の値(例: Y.T)でも「経歴書_Y.T」を返す", () => {
    expect(buildPdfFileName("Y.T")).toBe("経歴書_Y.T");
  });

  it("氏名内の空白(半角・全角、前後・途中とも)はすべて除去する", () => {
    expect(buildPdfFileName("  山田太郎  ")).toBe("経歴書_山田太郎");
    expect(buildPdfFileName("テスト 太郎")).toBe("経歴書_テスト太郎");
    expect(buildPdfFileName("テスト　太郎")).toBe("経歴書_テスト太郎");
  });

  it("空文字・空白のみは「経歴書」を返す", () => {
    expect(buildPdfFileName("")).toBe("経歴書");
    expect(buildPdfFileName("   ")).toBe("経歴書");
  });

  it('ファイル名に使えない記号(\\ / : * ? " < > |)は_に置換する', () => {
    expect(buildPdfFileName('a\\b/c:d*e?f"g<h>i|j')).toBe(
      "経歴書_a_b_c_d_e_f_g_h_i_j",
    );
  });
});
