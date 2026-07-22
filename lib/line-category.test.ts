import { describe, expect, it } from "vitest";

import { categorizeLine, groupLinesByCategory, LINE_CATEGORIES } from "@/lib/line-category";

describe("categorizeLine", () => {
  it("「JR」を含む路線名はJRに分類する(例: JR山手線)", () => {
    expect(categorizeLine("JR山手線")).toBe("JR");
  });

  it("「新幹線」を含む路線名は新幹線に分類する(例: 東海道新幹線)", () => {
    expect(categorizeLine("東海道新幹線")).toBe("新幹線");
  });

  it("「地下鉄」または「メトロ」を含む路線名は地下鉄に分類する(例: 東京メトロ丸ノ内線・福岡市地下鉄空港線)", () => {
    expect(categorizeLine("東京メトロ丸ノ内線")).toBe("地下鉄");
    expect(categorizeLine("福岡市地下鉄空港線")).toBe("地下鉄");
  });

  it("都営4路線(浅草線・三田線・新宿線・大江戸線)は地下鉄に分類する", () => {
    expect(categorizeLine("都営浅草線")).toBe("地下鉄");
    expect(categorizeLine("都営三田線")).toBe("地下鉄");
    expect(categorizeLine("都営新宿線")).toBe("地下鉄");
    expect(categorizeLine("都営大江戸線")).toBe("地下鉄");
  });

  it("「モノレール」「新交通」「新都市交通」「ライナー」を含む路線名はモノレール・新交通に分類する(例: 東京モノレール羽田空港線・埼玉新都市交通伊奈線・日暮里・舎人ライナー)", () => {
    expect(categorizeLine("東京モノレール羽田空港線")).toBe("モノレール・新交通");
    expect(categorizeLine("埼玉新都市交通伊奈線")).toBe("モノレール・新交通");
    expect(categorizeLine("日暮里・舎人ライナー")).toBe("モノレール・新交通");
  });

  it("モノレール・新交通の個別リストに一致する路線名はモノレール・新交通に分類する(例: ゆりかもめ)", () => {
    expect(categorizeLine("ゆりかもめ")).toBe("モノレール・新交通");
  });

  it("いずれにも該当しない路線名は私鉄・その他に分類する(例: 京王線)", () => {
    expect(categorizeLine("京王線")).toBe("私鉄・その他");
  });

  it("「新幹線」と「JR」の両方を含む路線名は新幹線を優先する", () => {
    expect(categorizeLine("JR東海道新幹線")).toBe("新幹線");
  });
});

describe("groupLinesByCategory", () => {
  it("路線名の配列をカテゴリごとにグループ化し、各カテゴリ内は入力順を保つ", () => {
    const grouped = groupLinesByCategory([
      "JR山手線",
      "都営浅草線",
      "JR中央線",
      "京王線",
      "東海道新幹線",
    ]);
    expect(grouped["JR"]).toEqual(["JR山手線", "JR中央線"]);
    expect(grouped["地下鉄"]).toEqual(["都営浅草線"]);
    expect(grouped["私鉄・その他"]).toEqual(["京王線"]);
    expect(grouped["新幹線"]).toEqual(["東海道新幹線"]);
  });

  it("該当路線がないカテゴリも空配列としてキーを持つ", () => {
    const grouped = groupLinesByCategory(["JR山手線"]);
    for (const category of LINE_CATEGORIES) {
      expect(grouped[category]).toBeDefined();
    }
    expect(grouped["モノレール・新交通"]).toEqual([]);
  });
});
