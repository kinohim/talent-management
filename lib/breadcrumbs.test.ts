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
    expect(getBreadcrumbTrail("/basic-info")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/mypage", label: "私の経歴書" },
      { path: "/basic-info", label: "基本情報登録" },
    ]);
  });

  it("プロジェクト経歴登録の親は私の経歴書(実績タブの合成キー)", () => {
    expect(getBreadcrumbTrail("/projects/new")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/mypage?tab=projects", label: "私の経歴書" },
      { path: "/projects/new", label: "プロジェクト経歴登録" },
    ]);
  });

  it("プロジェクト経歴編集(動的ID)は[id]正規化で解決し、自身のpathは実パスで返す", () => {
    expect(getBreadcrumbTrail("/projects/123")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/mypage?tab=projects", label: "私の経歴書" },
      { path: "/projects/123", label: "プロジェクト経歴編集" },
    ]);
  });

  it("経歴書詳細(動的ID)の親は経歴書一覧(戻り導線の一本化)", () => {
    expect(getBreadcrumbTrail("/resumes/000001")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/resumes", label: "経歴書一覧" },
      { path: "/resumes/000001", label: "経歴書詳細" },
    ]);
  });

  it("PDF出力プレビューの親は経歴書詳細で、親のpathも実パスで返す", () => {
    expect(getBreadcrumbTrail("/resumes/000001/pdf-preview")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/resumes", label: "経歴書一覧" },
      { path: "/resumes/000001", label: "経歴書詳細" },
      { path: "/resumes/000001/pdf-preview", label: "PDF出力プレビュー" },
    ]);
  });

  it("from=listのときPDF出力プレビューの親は経歴書一覧(一覧の「PDF」発)", () => {
    expect(
      getBreadcrumbTrail("/resumes/000001/pdf-preview", { from: "list" }),
    ).toEqual([
      { path: "/", label: "トップ" },
      { path: "/resumes", label: "経歴書一覧" },
      { path: "/resumes/000001/pdf-preview?from=list", label: "PDF出力プレビュー" },
    ]);
  });

  it("合成キーがない画面ではfrom=listを無視して従来どおり解決する", () => {
    expect(getBreadcrumbTrail("/resumes/000001", { from: "list" })).toEqual([
      { path: "/", label: "トップ" },
      { path: "/resumes", label: "経歴書一覧" },
      { path: "/resumes/000001", label: "経歴書詳細" },
    ]);
  });

  it("/mypage/pdf-previewの親は私の経歴書", () => {
    expect(getBreadcrumbTrail("/mypage/pdf-preview")).toEqual([
      { path: "/", label: "トップ" },
      { path: "/mypage", label: "私の経歴書" },
      { path: "/mypage/pdf-preview", label: "PDF出力プレビュー" },
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
