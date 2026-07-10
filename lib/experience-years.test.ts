import { describe, expect, it } from "vitest";

import { calculateExperienceYears, sumUnionMonths } from "./experience-years";

describe("sumUnionMonths", () => {
  it("区間が0件なら0を返す", () => {
    expect(sumUnionMonths([])).toBe(0);
  });

  it("重複しない区間は単純に合算する", () => {
    // 2020-01〜2020-03(3ヶ月) + 2021-01〜2021-02(2ヶ月) = 5ヶ月
    const total = sumUnionMonths([
      { startMonthIndex: 2020 * 12 + 0, endMonthIndex: 2020 * 12 + 2 },
      { startMonthIndex: 2021 * 12 + 0, endMonthIndex: 2021 * 12 + 1 },
    ]);
    expect(total).toBe(5);
  });

  it("重複する区間は重複月を1回だけ数える", () => {
    // 2020-01〜2020-06(6ヶ月) と 2020-04〜2020-09(6ヶ月) は 2020-04〜06が重複
    // 和集合は2020-01〜2020-09の9ヶ月
    const total = sumUnionMonths([
      { startMonthIndex: 2020 * 12 + 0, endMonthIndex: 2020 * 12 + 5 },
      { startMonthIndex: 2020 * 12 + 3, endMonthIndex: 2020 * 12 + 8 },
    ]);
    expect(total).toBe(9);
  });

  it("完全に内包される区間は外側の区間の月数のみ数える", () => {
    const total = sumUnionMonths([
      { startMonthIndex: 2020 * 12 + 0, endMonthIndex: 2020 * 12 + 11 },
      { startMonthIndex: 2020 * 12 + 3, endMonthIndex: 2020 * 12 + 5 },
    ]);
    expect(total).toBe(12);
  });

  it("入力順序に依存せず同じ結果になる", () => {
    const intervals = [
      { startMonthIndex: 2021 * 12 + 0, endMonthIndex: 2021 * 12 + 1 },
      { startMonthIndex: 2020 * 12 + 0, endMonthIndex: 2020 * 12 + 2 },
    ];
    expect(sumUnionMonths(intervals)).toBe(5);
  });
});

describe("calculateExperienceYears", () => {
  const today = new Date(Date.UTC(2024, 5, 15)); // 2024-06-15

  it("プロジェクトが0件なら0年", () => {
    expect(calculateExperienceYears([], today)).toBe(0);
  });

  it("12ヶ月ちょうどなら1年", () => {
    const years = calculateExperienceYears(
      [
        {
          startDate: new Date(Date.UTC(2020, 0, 1)),
          endDate: new Date(Date.UTC(2020, 11, 1)),
        },
      ],
      today,
    );
    expect(years).toBe(1);
  });

  it("端数月は切り捨てる", () => {
    // 2020-01〜2021-01の13ヶ月 → 1年(端数1ヶ月切り捨て)
    const years = calculateExperienceYears(
      [
        {
          startDate: new Date(Date.UTC(2020, 0, 1)),
          endDate: new Date(Date.UTC(2021, 0, 1)),
        },
      ],
      today,
    );
    expect(years).toBe(1);
  });

  it("進行中(endDate=null)のプロジェクトはtodayの年月まで含める", () => {
    // 2023-06〜進行中、today=2024-06 → 13ヶ月 → 1年
    const years = calculateExperienceYears(
      [{ startDate: new Date(Date.UTC(2023, 5, 1)), endDate: null }],
      today,
    );
    expect(years).toBe(1);
  });

  it("重複期間の複数プロジェクトを和集合で正しく計算する", () => {
    // 2018-01〜2019-12(24ヶ月)と2019-01〜2020-12(24ヶ月)の重複12ヶ月(2019年)
    // 和集合は2018-01〜2020-12の36ヶ月 → 3年
    const years = calculateExperienceYears(
      [
        {
          startDate: new Date(Date.UTC(2018, 0, 1)),
          endDate: new Date(Date.UTC(2019, 11, 1)),
        },
        {
          startDate: new Date(Date.UTC(2019, 0, 1)),
          endDate: new Date(Date.UTC(2020, 11, 1)),
        },
      ],
      today,
    );
    expect(years).toBe(3);
  });
});
