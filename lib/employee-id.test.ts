import { describe, expect, it } from "vitest";

import { nextEmployeeId } from "./employee-id";

describe("nextEmployeeId", () => {
  it("最大社員ID+1を6桁ゼロ埋めで返す", () => {
    expect(nextEmployeeId("001030")).toBe("001031");
    expect(nextEmployeeId("000009")).toBe("000010");
    expect(nextEmployeeId("099999")).toBe("100000");
  });

  it("社員が存在しない・形式不正なら000001を返す", () => {
    expect(nextEmployeeId(null)).toBe("000001");
    expect(nextEmployeeId("")).toBe("000001");
    expect(nextEmployeeId("12345")).toBe("000001");
    expect(nextEmployeeId("abc123")).toBe("000001");
  });

  it("6桁の上限では999999のまま返す", () => {
    expect(nextEmployeeId("999999")).toBe("999999");
  });
});
