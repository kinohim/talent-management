import { describe, expect, it } from "vitest";

import { initialsFromKana } from "./print-name";

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
