import { describe, expect, it } from "vitest";

import { getBreadcrumbTrail } from "./breadcrumbs";

describe("getBreadcrumbTrail", () => {
  it("トップは単独のパンくずを返す", () => {
    expect(getBreadcrumbTrail("/")).toEqual([{ path: "/", label: "トップ" }]);
  });

  it("マイページはトップ→マイページの2件を返す", () => {
    expect(getBreadcrumbTrail("/mypage")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/mypage", label: "マイページ" },
    ]);
  });

  it("基本情報登録はトップ→マイページ→基本情報登録の3件を返す", () => {
    expect(getBreadcrumbTrail("/register")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/mypage", label: "マイページ" },
      { path: "/register", label: "基本情報登録" },
    ]);
  });

  it("未登録パスは空配列を返す", () => {
    expect(getBreadcrumbTrail("/unknown")).toEqual([]);
  });
});
