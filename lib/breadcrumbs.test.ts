import { describe, expect, it } from "vitest";

import { getBreadcrumbTrail } from "./breadcrumbs";

describe("getBreadcrumbTrail", () => {
  it("トップは単独のパンくずを返す", () => {
    expect(getBreadcrumbTrail("/")).toEqual([{ path: "/", label: "トップ" }]);
  });

  it("私の経歴書はトップ→私の経歴書の2件を返す", () => {
    expect(getBreadcrumbTrail("/mypage")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/mypage", label: "私の経歴書" },
    ]);
  });

  it("基本情報登録はトップ→私の経歴書→基本情報登録の3件を返す", () => {
    expect(getBreadcrumbTrail("/register")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/mypage", label: "私の経歴書" },
      { path: "/register", label: "基本情報登録" },
    ]);
  });

  it("プロジェクト経歴登録の親は私の経歴書(実績タブの合成キー)", () => {
    expect(getBreadcrumbTrail("/projects/new")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/mypage?tab=projects", label: "私の経歴書" },
      { path: "/projects/new", label: "プロジェクト経歴登録" },
    ]);
  });

  it("プロジェクト経歴編集(動的ID)は数値セグメントを[id]に正規化して解決する", () => {
    expect(getBreadcrumbTrail("/projects/123")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/mypage?tab=projects", label: "私の経歴書" },
      { path: "/projects/[id]", label: "プロジェクト経歴編集" },
    ]);
  });

  it("経歴書詳細(動的ID)の親は経歴書一覧(戻り導線の一本化)", () => {
    expect(getBreadcrumbTrail("/resumes/000001")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/resumes", label: "経歴書一覧" },
      { path: "/resumes/[id]", label: "経歴書詳細" },
    ]);
  });

  it("廃止した単独編集画面のパスは未登録として空配列を返す", () => {
    expect(getBreadcrumbTrail("/career-summary")).toEqual([]);
    expect(getBreadcrumbTrail("/skills")).toEqual([]);
    expect(getBreadcrumbTrail("/certifications")).toEqual([]);
    expect(getBreadcrumbTrail("/projects")).toEqual([]);
  });

  it("未登録パスは空配列を返す", () => {
    expect(getBreadcrumbTrail("/unknown")).toEqual([]);
  });
});
