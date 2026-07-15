import { describe, expect, it } from "vitest";

import {
  parseDateOnly,
  parseYearMonth,
  toDateInputValue,
  toDisplayDate,
  toDisplayDateTime,
  toDisplayYearMonth,
  toMonthInputValue,
  todayJstDateOnly,
  nowJstClock,
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

  it("UTC瞬間をJSTの日本語形式(時分まで)に変換する", () => {
    const date = new Date("2024-01-31T00:05:00Z");
    expect(toDisplayDateTime(date)).toBe("2024年1月31日 09:05");
  });

  it("JSTで日付が繰り上がるUTC瞬間でも正しく変換する", () => {
    const date = new Date("2024-01-31T23:30:00Z");
    expect(toDisplayDateTime(date)).toBe("2024年2月1日 08:30");
  });
});

describe("todayJstDateOnly", () => {
  it("JSTの今日をUTC深夜のDateとして返す", () => {
    // UTC 2024-01-31 20:00 = JST 2024-02-01 05:00
    const now = new Date("2024-01-31T20:00:00Z");
    expect(todayJstDateOnly(now).toISOString()).toBe(
      "2024-02-01T00:00:00.000Z",
    );
  });

  it("JSTとUTCが同日の時刻ではその日を返す", () => {
    const now = new Date("2024-01-31T10:00:00Z");
    expect(todayJstDateOnly(now).toISOString()).toBe(
      "2024-01-31T00:00:00.000Z",
    );
  });
});

describe("nowJstClock", () => {
  it("JSTの壁時計をUTC getterで読めるDateを返す", () => {
    // UTC 2024-01-31 23:30 = JST 2024-02-01 08:30 → 月が繰り上がる
    const now = new Date("2024-01-31T23:30:00Z");
    const jst = nowJstClock(now);
    expect(jst.getUTCFullYear()).toBe(2024);
    expect(jst.getUTCMonth()).toBe(1);
    expect(jst.getUTCDate()).toBe(1);
  });
});
