import { describe, expect, it } from "vitest";

import { predictGraduationYearMonth } from "./graduation";

describe("predictGraduationYearMonth", () => {
  it("4〜12月生まれは生年+23年の3月を返す", () => {
    expect(predictGraduationYearMonth("2000-04-01")).toBe("2023-03");
    expect(predictGraduationYearMonth("2000-12-31")).toBe("2023-03");
  });

  it("1〜3月生まれ(早生まれ)は生年+22年の3月を返す", () => {
    expect(predictGraduationYearMonth("2000-01-15")).toBe("2022-03");
    expect(predictGraduationYearMonth("2000-03-31")).toBe("2022-03");
  });

  it("生年月日が不完全・不正ならnullを返す", () => {
    expect(predictGraduationYearMonth("")).toBeNull();
    expect(predictGraduationYearMonth("2000")).toBeNull();
    expect(predictGraduationYearMonth("2000-")).toBeNull();
    expect(predictGraduationYearMonth("2000-13-01")).toBeNull();
    expect(predictGraduationYearMonth("2000-00-01")).toBeNull();
  });
});
