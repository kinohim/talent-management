import { describe, expect, it } from "vitest";

import {
  DEFAULT_PAGE_SIZE,
  clampPage,
  parsePagination,
  parseSort,
} from "@/lib/list-query";

describe("parsePagination", () => {
  it("未指定はpage=1・pageSize=30", () => {
    expect(parsePagination({})).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  });

  it("正常値をパースする", () => {
    expect(parsePagination({ page: "3", pageSize: "50" })).toEqual({
      page: 3,
      pageSize: 50,
    });
  });

  it("不正なpageは1にフォールバックする", () => {
    expect(parsePagination({ page: "0" }).page).toBe(1);
    expect(parsePagination({ page: "-2" }).page).toBe(1);
    expect(parsePagination({ page: "abc" }).page).toBe(1);
    expect(parsePagination({ page: "1.5" }).page).toBe(1);
  });

  it("許可リスト外のpageSizeは30にフォールバックする", () => {
    expect(parsePagination({ pageSize: "25" }).pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePagination({ pageSize: "1000" }).pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePagination({ pageSize: "abc" }).pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it("配列値は先頭を使う", () => {
    expect(parsePagination({ page: ["2", "9"] }).page).toBe(2);
  });
});

describe("parseSort", () => {
  const allowed = ["name", "org"] as const;

  it("許可リスト内のキーとorderをパースする", () => {
    expect(parseSort({ sort: "name", order: "desc" }, allowed)).toEqual({
      sortKey: "name",
      order: "desc",
    });
  });

  it("許可リスト外・未指定はsortKey=null", () => {
    expect(parseSort({ sort: "hack" }, allowed).sortKey).toBeNull();
    expect(parseSort({}, allowed).sortKey).toBeNull();
  });

  it("orderはdesc以外すべてasc", () => {
    expect(parseSort({ sort: "name", order: "DESC" }, allowed).order).toBe("asc");
    expect(parseSort({ sort: "name" }, allowed).order).toBe("asc");
  });
});

describe("clampPage", () => {
  it("範囲内のページはそのまま", () => {
    expect(clampPage(2, 100, 30)).toEqual({ page: 2, skip: 30, pageCount: 4 });
  });

  it("最終ページ超過は最終ページへ丸める", () => {
    expect(clampPage(9, 100, 30)).toEqual({ page: 4, skip: 90, pageCount: 4 });
  });

  it("0件でもpageCountは1(page=1, skip=0)", () => {
    expect(clampPage(5, 0, 30)).toEqual({ page: 1, skip: 0, pageCount: 1 });
  });

  it("件数がページサイズちょうどのときpageCountは1", () => {
    expect(clampPage(1, 30, 30).pageCount).toBe(1);
  });
});
