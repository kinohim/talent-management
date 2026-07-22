import { describe, expect, it } from "vitest";

import { parseSiteMasterForm } from "./site-master-schema";

function formDataWith(
  siteName: string | null,
  organizationUnitId?: string,
  nearestStation?: { prefecture?: string; line?: string; name?: string },
): FormData {
  const formData = new FormData();
  if (siteName !== null) formData.set("siteName", siteName);
  if (organizationUnitId !== undefined) {
    formData.set("organizationUnitId", organizationUnitId);
  }
  if (nearestStation?.prefecture !== undefined) {
    formData.set("nearestStationPrefecture", nearestStation.prefecture);
  }
  if (nearestStation?.line !== undefined) {
    formData.set("nearestStationLine", nearestStation.line);
  }
  if (nearestStation?.name !== undefined) {
    formData.set("nearestStationName", nearestStation.name);
  }
  return formData;
}

describe("parseSiteMasterForm", () => {
  it("正常な現場名を受け付ける(主管部署未指定はnull)", () => {
    const result = parseSiteMasterForm(formDataWith("A社基幹システム更改"));
    expect(result).toEqual({
      success: true,
      siteName: "A社基幹システム更改",
      organizationUnitId: null,
    });
  });

  it("前後の空白はtrimされる", () => {
    const result = parseSiteMasterForm(formDataWith("  B社ECサイト構築  "));
    expect(result).toEqual({
      success: true,
      siteName: "B社ECサイト構築",
      organizationUnitId: null,
    });
  });

  it("主管部署のidを数値で受け付ける(空文字はnull)", () => {
    expect(parseSiteMasterForm(formDataWith("C社", "12"))).toEqual({
      success: true,
      siteName: "C社",
      organizationUnitId: 12,
    });
    expect(parseSiteMasterForm(formDataWith("C社", ""))).toEqual({
      success: true,
      siteName: "C社",
      organizationUnitId: null,
    });
  });

  it("主管部署が数値でなければエラー", () => {
    expect(parseSiteMasterForm(formDataWith("C社", "abc")).success).toBe(false);
  });

  it("空文字はエラー", () => {
    expect(parseSiteMasterForm(formDataWith("")).success).toBe(false);
  });

  it("未入力(フィールド自体が無い)はエラー", () => {
    expect(parseSiteMasterForm(formDataWith(null)).success).toBe(false);
  });

  it("100文字ちょうどは許可", () => {
    expect(parseSiteMasterForm(formDataWith("あ".repeat(100))).success).toBe(true);
  });

  it("101文字はエラー", () => {
    expect(parseSiteMasterForm(formDataWith("あ".repeat(101))).success).toBe(false);
  });

  it("最寄駅(路線名・駅名)が未入力でも成功する", () => {
    const result = parseSiteMasterForm(formDataWith("D社"));
    expect(result).toEqual({
      success: true,
      siteName: "D社",
      organizationUnitId: null,
      nearestStationLine: undefined,
      nearestStationName: undefined,
    });
  });

  it("最寄駅(路線名・駅名)の前後の空白はtrimされる", () => {
    const result = parseSiteMasterForm(
      formDataWith("D社", undefined, { line: "  JR山手線  ", name: "  渋谷駅  " }),
    );
    expect(result).toEqual({
      success: true,
      siteName: "D社",
      organizationUnitId: null,
      nearestStationLine: "JR山手線",
      nearestStationName: "渋谷駅",
    });
  });

  it("最寄駅(路線名・駅名)は100文字ちょうどまで許可", () => {
    const result = parseSiteMasterForm(
      formDataWith("D社", undefined, { line: "あ".repeat(100), name: "あ".repeat(100) }),
    );
    expect(result.success).toBe(true);
  });

  it("最寄駅(路線名・駅名)の101文字はエラー", () => {
    expect(
      parseSiteMasterForm(formDataWith("D社", undefined, { line: "あ".repeat(101) })).success,
    ).toBe(false);
    expect(
      parseSiteMasterForm(formDataWith("D社", undefined, { name: "あ".repeat(101) })).success,
    ).toBe(false);
  });

  it("最寄駅(路線名・駅名)が空文字で送信された場合(未選択のselect)もundefinedとして扱う", () => {
    // NearestStationSelectは未選択でもname属性付きのselect/hidden inputを常に送信するため、
    // フィールド自体が無い場合とは別に「値が空文字」のケースも検証する
    const result = parseSiteMasterForm(
      formDataWith("D社", undefined, { line: "", name: "" }),
    );
    expect(result).toEqual({
      success: true,
      siteName: "D社",
      organizationUnitId: null,
      nearestStationLine: undefined,
      nearestStationName: undefined,
    });
  });

  it("都道府県が未入力でも成功する(undefined)", () => {
    const result = parseSiteMasterForm(formDataWith("D社"));
    expect(result).toEqual({
      success: true,
      siteName: "D社",
      organizationUnitId: null,
      nearestStationPrefecture: undefined,
      nearestStationLine: undefined,
      nearestStationName: undefined,
    });
  });

  it("都道府県はPREFECTURES(47都道府県)に含まれる値のみ許可し、それ以外はエラー", () => {
    expect(
      parseSiteMasterForm(formDataWith("D社", undefined, { prefecture: "東京都" }))
        .success,
    ).toBe(true);
    expect(
      parseSiteMasterForm(formDataWith("D社", undefined, { prefecture: "東京府" }))
        .success,
    ).toBe(false);
  });

  it("都道府県が空文字で送信された場合(未選択のselect)もundefinedとして扱う", () => {
    const result = parseSiteMasterForm(
      formDataWith("D社", undefined, { prefecture: "" }),
    );
    expect(result).toEqual({
      success: true,
      siteName: "D社",
      organizationUnitId: null,
      nearestStationPrefecture: undefined,
      nearestStationLine: undefined,
      nearestStationName: undefined,
    });
  });
});
