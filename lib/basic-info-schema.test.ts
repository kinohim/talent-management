import { describe, expect, it } from "vitest";

import { flattenFieldErrors, parseBasicInfoForm } from "./basic-info-schema";

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

const validEntries = {
  name: "山田太郎",
  nameKana: "ヤマダ タロウ",
  birthDate: "1990-01-01",
};

describe("parseBasicInfoForm", () => {
  it("必須項目が揃っていれば成功する", () => {
    const result = parseBasicInfoForm(formData(validEntries));
    expect(result.success).toBe(true);
  });

  it("氏名が未入力なら失敗する", () => {
    const result = parseBasicInfoForm(
      formData({ ...validEntries, name: "" }),
    );
    expect(result.success).toBe(false);
  });

  it("氏名が51文字なら失敗する", () => {
    const result = parseBasicInfoForm(
      formData({ ...validEntries, name: "あ".repeat(51) }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(flattenFieldErrors(result.error).name).toBe(
        "氏名は50文字以内で入力してください。",
      );
    }
  });

  it("カナに非カタカナが混入していれば失敗する", () => {
    const result = parseBasicInfoForm(
      formData({ ...validEntries, nameKana: "やまだ太郎" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(flattenFieldErrors(result.error).nameKana).toBe(
        "カナは全角カタカナで入力してください。",
      );
    }
  });

  it("カナにスペースがない(1語)なら失敗し、姓名区切りエラーを返す", () => {
    const result = parseBasicInfoForm(
      formData({ ...validEntries, nameKana: "ヤマダタロウ" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(flattenFieldErrors(result.error).nameKana).toBe(
        "カナは姓と名の間にスペースを入れて入力してください。",
      );
    }
  });

  it("カナが3語以上なら失敗し、姓名区切りエラーを返す", () => {
    const result = parseBasicInfoForm(
      formData({ ...validEntries, nameKana: "ヤマダ タロウ ジロウ" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(flattenFieldErrors(result.error).nameKana).toBe(
        "カナは姓と名の間にスペースを入れて入力してください。",
      );
    }
  });

  it("生年月日の形式が不正なら失敗する", () => {
    const result = parseBasicInfoForm(
      formData({ ...validEntries, birthDate: "1990/01/01" }),
    );
    expect(result.success).toBe(false);
  });

  it("任意項目の空文字はundefinedとして扱われ成功する", () => {
    const result = parseBasicInfoForm(
      formData({ ...validEntries, nearestStationLine: "" }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nearestStationLine).toBeUndefined();
    }
  });

  it("最寄駅の都道府県はPREFECTURES(47都道府県)に含まれる値のみ許可し、それ以外はエラー", () => {
    const okResult = parseBasicInfoForm(
      formData({ ...validEntries, nearestStationPrefecture: "東京都" }),
    );
    expect(okResult.success).toBe(true);

    const ngResult = parseBasicInfoForm(
      formData({ ...validEntries, nearestStationPrefecture: "東京府" }),
    );
    expect(ngResult.success).toBe(false);
  });

  it("任意項目を正しく入力すると値が反映される", () => {
    const result = parseBasicInfoForm(
      formData({
        ...validEntries,
        gender: "MALE",
        nearestStationLine: "JR山手線",
        nearestStationName: "渋谷駅",
        finalSchoolType: "UNIVERSITY",
        graduationStatus: "GRADUATED",
        graduationYearMonth: "2012-03",
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gender).toBe("MALE");
      expect(result.data.graduationYearMonth).toBe("2012-03");
    }
  });
});
