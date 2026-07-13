import { describe, expect, it } from "vitest";

import {
  parseDateOnly,
  parseYearMonth,
  toDateInputValue,
  toDisplayDate,
  toDisplayDateTime,
  toDisplayYearMonth,
  toMonthInputValue,
} from "./date-format";

describe("toDateInputValue / parseDateOnly", () => {
  it("nullish値は空文字を返す", () => {
    expect(toDateInputValue(null)).toBe("");
    expect(toDateInputValue(undefined)).toBe("");
  });

  it("UTC基準で往復一致する", () => {
    const date = parseDateOnly("2024-01-31");
    expect(toDateInputValue(date)).toBe("2024-01-31");
  });

  it("年始・月末などの境界日でもズレない", () => {
    expect(toDateInputValue(parseDateOnly("2000-12-31"))).toBe("2000-12-31");
    expect(toDateInputValue(parseDateOnly("2000-01-01"))).toBe("2000-01-01");
  });
});

describe("toMonthInputValue / parseYearMonth", () => {
  it("nullish値は空文字を返す", () => {
    expect(toMonthInputValue(null)).toBe("");
    expect(toMonthInputValue(undefined)).toBe("");
  });

  it("YYYYMM01形式(1日固定)で往復一致する", () => {
    const date = parseYearMonth("2024-03");
    expect(toMonthInputValue(date)).toBe("2024-03");
    expect(date.getUTCDate()).toBe(1);
  });

  it("年をまたぐ月でもズレない", () => {
    expect(toMonthInputValue(parseYearMonth("1999-12"))).toBe("1999-12");
  });
});

describe("toDisplayDate", () => {
  it("nullish値は空文字を返す", () => {
    expect(toDisplayDate(null)).toBe("");
    expect(toDisplayDate(undefined)).toBe("");
  });

  it("日本語形式に変換する", () => {
    expect(toDisplayDate(parseDateOnly("2024-01-31"))).toBe("2024年1月31日");
  });

  it("年始の境界日でもズレない", () => {
    expect(toDisplayDate(parseDateOnly("2000-01-01"))).toBe("2000年1月1日");
  });
});

describe("toDisplayYearMonth", () => {
  it("nullish値は空文字を返す", () => {
    expect(toDisplayYearMonth(null)).toBe("");
    expect(toDisplayYearMonth(undefined)).toBe("");
  });

  it("日本語形式に変換する", () => {
    expect(toDisplayYearMonth(parseYearMonth("2024-03"))).toBe("2024年3月");
  });

  it("年をまたぐ月でもズレない", () => {
    expect(toDisplayYearMonth(parseYearMonth("1999-12"))).toBe("1999年12月");
  });
});

describe("toDisplayDateTime", () => {
  it("nullish値は空文字を返す", () => {
    expect(toDisplayDateTime(null)).toBe("");
    expect(toDisplayDateTime(undefined)).toBe("");
  });

  it("日本語形式(時分まで、ローカルタイムゾーン)に変換する", () => {
    const date = new Date(2024, 0, 31, 9, 5);
    expect(toDisplayDateTime(date)).toBe("2024年1月31日 09:05");
  });
});
