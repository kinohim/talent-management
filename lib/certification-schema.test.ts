import { afterEach, describe, expect, it, vi } from "vitest";

import { parseCertificationRowsForm } from "./certification-schema";

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

describe("parseCertificationRowsForm", () => {
  it("行が0件でも成功する(全資格削除を許容)", () => {
    const result = parseCertificationRowsForm(formData({}));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.rows).toEqual([]);
    }
  });

  it("有効期限なしの1行が成功する", () => {
    const result = parseCertificationRowsForm(
      formData({
        "items.0.certificationCategoryId": "1",
        "items.0.certificationId": "2",
        "items.0.acquiredDate": "2020-01-01",
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.rows).toEqual([
        {
          certificationCategoryId: "1",
          certificationId: "2",
          acquiredDate: "2020-01-01",
          expirationDate: undefined,
        },
      ]);
    }
  });

  it("有効期限が取得年月日より後なら成功する", () => {
    const result = parseCertificationRowsForm(
      formData({
        "items.0.certificationCategoryId": "1",
        "items.0.certificationId": "2",
        "items.0.acquiredDate": "2020-01-01",
        "items.0.expirationDate": "2023-01-01",
      }),
    );
    expect(result.success).toBe(true);
  });

  it("indexが欠番(0と2)でも両方の行を復元する", () => {
    const result = parseCertificationRowsForm(
      formData({
        "items.0.certificationCategoryId": "1",
        "items.0.certificationId": "2",
        "items.0.acquiredDate": "2020-01-01",
        "items.2.certificationCategoryId": "1",
        "items.2.certificationId": "3",
        "items.2.acquiredDate": "2021-01-01",
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.rows).toHaveLength(2);
    }
  });

  it("必須項目が欠けている行はrowErrorsを返す", () => {
    const result = parseCertificationRowsForm(
      formData({
        "items.0.certificationCategoryId": "1",
        "items.0.acquiredDate": "2020-01-01",
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.rowErrors[0]?.certificationId).toBe(
        "資格名を選択してください。",
      );
    }
  });

  it("取得年月日が未来日ならrowErrorsを返す", () => {
    const result = parseCertificationRowsForm(
      formData({
        "items.0.certificationCategoryId": "1",
        "items.0.certificationId": "2",
        "items.0.acquiredDate": "2999-01-01",
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.rowErrors[0]?.acquiredDate).toBe(
        "取得年月日は本日以前の日付を入力してください。",
      );
    }
  });

  it("有効期限が取得年月日以前ならrowErrorsを返す", () => {
    const result = parseCertificationRowsForm(
      formData({
        "items.0.certificationCategoryId": "1",
        "items.0.certificationId": "2",
        "items.0.acquiredDate": "2020-01-01",
        "items.0.expirationDate": "2020-01-01",
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.rowErrors[0]?.expirationDate).toBe(
        "有効期限は取得年月日より後の日付を入力してください。",
      );
    }
  });

  describe("本日以前の判定はJST基準", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("UTCではまだ前日でも、JSTの今日の日付を許容する", () => {
      // UTC 2024-01-31 20:00 = JST 2024-02-01 05:00 → JSTの今日は2月1日
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-31T20:00:00Z"));
      const result = parseCertificationRowsForm(
        formData({
          "items.0.certificationCategoryId": "1",
          "items.0.certificationId": "2",
          "items.0.acquiredDate": "2024-02-01",
        }),
      );
      expect(result.success).toBe(true);
    });

    it("JSTの明日の日付はエラーになる", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-31T20:00:00Z"));
      const result = parseCertificationRowsForm(
        formData({
          "items.0.certificationCategoryId": "1",
          "items.0.certificationId": "2",
          "items.0.acquiredDate": "2024-02-02",
        }),
      );
      expect(result.success).toBe(false);
    });
  });

  it("同一資格を複数行(再取得)登録しても成功する", () => {
    const result = parseCertificationRowsForm(
      formData({
        "items.0.certificationCategoryId": "1",
        "items.0.certificationId": "2",
        "items.0.acquiredDate": "2018-01-01",
        "items.1.certificationCategoryId": "1",
        "items.1.certificationId": "2",
        "items.1.acquiredDate": "2023-01-01",
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.rows).toHaveLength(2);
    }
  });
});
