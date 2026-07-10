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

  it("経歴概要・自己PR登録はトップ→マイページ→経歴概要・自己PR登録の3件を返す", () => {
    expect(getBreadcrumbTrail("/career-summary")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/mypage", label: "マイページ" },
      { path: "/career-summary", label: "経歴概要・自己PR登録" },
    ]);
  });

  it("スキル登録はトップ→マイページ→スキル登録の3件を返す", () => {
    expect(getBreadcrumbTrail("/skills")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/mypage", label: "マイページ" },
      { path: "/skills", label: "スキル登録" },
    ]);
  });

  it("資格登録はトップ→マイページ→資格登録の3件を返す", () => {
    expect(getBreadcrumbTrail("/certifications")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/mypage", label: "マイページ" },
      { path: "/certifications", label: "資格登録" },
    ]);
  });

  it("プロジェクト経歴一覧はトップ→マイページ→プロジェクト経歴一覧の3件を返す", () => {
    expect(getBreadcrumbTrail("/projects")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/mypage", label: "マイページ" },
      { path: "/projects", label: "プロジェクト経歴一覧" },
    ]);
  });

  it("プロジェクト経歴登録はトップ→マイページ→プロジェクト経歴一覧→プロジェクト経歴登録の4件を返す", () => {
    expect(getBreadcrumbTrail("/projects/new")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/mypage", label: "マイページ" },
      { path: "/projects", label: "プロジェクト経歴一覧" },
      { path: "/projects/new", label: "プロジェクト経歴登録" },
    ]);
  });

  it("プロジェクト経歴編集(動的ID)は数値セグメントを[id]に正規化して解決する", () => {
    expect(getBreadcrumbTrail("/projects/123")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/mypage", label: "マイページ" },
      { path: "/projects", label: "プロジェクト経歴一覧" },
      { path: "/projects/[id]", label: "プロジェクト経歴編集" },
    ]);
  });

  it("経歴書詳細(動的ID)は数値セグメントを[id]に正規化して解決する", () => {
    expect(getBreadcrumbTrail("/resumes/000001")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/mypage", label: "マイページ" },
      { path: "/resumes/[id]", label: "経歴書詳細" },
    ]);
  });

  it("未登録パスは空配列を返す", () => {
    expect(getBreadcrumbTrail("/unknown")).toEqual([]);
  });
});
