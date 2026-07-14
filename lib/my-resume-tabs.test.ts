import { describe, expect, it } from "vitest";

import { parseMyResumeTab } from "@/lib/my-resume-tabs";

describe("parseMyResumeTab", () => {
  it("projectsは実績タブ", () => {
    expect(parseMyResumeTab("projects")).toBe("projects");
  });

  it("未指定・不正値は表紙タブにフォールバックする", () => {
    expect(parseMyResumeTab(undefined)).toBe("cover");
    expect(parseMyResumeTab("cover")).toBe("cover");
    expect(parseMyResumeTab("invalid")).toBe("cover");
  });

  it("配列は先頭を使う", () => {
    expect(parseMyResumeTab(["projects", "cover"])).toBe("projects");
  });
});
