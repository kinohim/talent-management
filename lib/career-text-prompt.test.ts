import { describe, expect, it } from "vitest";

import {
  buildCareerTextPrompt,
  buildMissingDataMessage,
  listMissingData,
  type CareerTextPromptInput,
} from "./career-text-prompt";

function emptyInput(): CareerTextPromptInput {
  return {
    experienceYears: null,
    careerSummary: null,
    selfPr: null,
    projects: [],
    skills: [],
    certifications: [],
  };
}

function fullInput(): CareerTextPromptInput {
  return {
    experienceYears: 8,
    careerSummary: "Web系の開発に従事してきました。",
    selfPr: "課題解決力が強みです。",
    projects: [
      {
        projectTitle: "ECサイト刷新",
        industry: "小売",
        projectSummary: "基幹ECのリプレイス",
        overview: "バックエンドAPIの設計・実装",
        startDate: new Date(2022, 3, 1),
        endDate: new Date(2024, 8, 30),
        roles: ["SE", "PL"],
        skills: ["TypeScript", "PostgreSQL"],
        phases: ["基本設計", "開発", "テスト"],
      },
    ],
    skills: [
      { name: "TypeScript", version: "5", level: "EXPERT" },
      { name: "Java", version: null, level: "BASIC" },
    ],
    certifications: [
      { name: "応用情報技術者", acquiredDate: new Date(2021, 9, 1) },
    ],
  };
}

describe("buildCareerTextPrompt", () => {
  it("経歴・スキル・資格・経験年数がプロンプトに反映される", () => {
    const { user } = buildCareerTextPrompt("selfPr", fullInput());
    expect(user).toContain("8年");
    expect(user).toContain("ECサイト刷新(2022/04〜2024/09)");
    expect(user).toContain("ロール: SE、PL");
    expect(user).toContain("担当工程: 基本設計、開発、テスト");
    expect(user).toContain("TypeScript 5(得意)");
    expect(user).toContain("Java(基礎知識)");
    expect(user).toContain("応用情報技術者(2021/10取得)");
  });

  it("終了日が未設定のプロジェクトは「現在」と表示される", () => {
    const input = fullInput();
    input.projects[0].endDate = null;
    const { user } = buildCareerTextPrompt("careerSummary", input);
    expect(user).toContain("2022/04〜現在");
  });

  it("targetごとにシステムプロンプトの指示が変わる", () => {
    const summary = buildCareerTextPrompt("careerSummary", fullInput());
    const selfPr = buildCareerTextPrompt("selfPr", fullInput());
    expect(summary.system).toContain("事実ベースで要約");
    expect(summary.system).toContain("「経歴概要」欄");
    expect(selfPr.system).toContain("強みを2〜3点");
    expect(selfPr.system).toContain("「自己PR」欄");
  });

  it("共通の文体・分量ルールが含まれる", () => {
    const { system } = buildCareerTextPrompt("selfPr", fullInput());
    expect(system).toContain("です・ます調");
    expect(system).toContain("300〜500字");
    expect(system).toContain("1000文字以内");
  });

  it("登録済みの文章があれば改善指示、なければ新規作成指示になる", () => {
    const withExisting = buildCareerTextPrompt("selfPr", fullInput());
    expect(withExisting.user).toContain("改善した文章を生成");
    expect(withExisting.user).toContain("## 登録済みの自己PR\n課題解決力が強みです。");

    const withoutExisting = buildCareerTextPrompt("selfPr", emptyInput());
    expect(withoutExisting.user).toContain("ゼロから作成");
    expect(withoutExisting.user).not.toContain("## 登録済みの自己PR");
  });

  it("未登録の項目は(未登録)と表示される", () => {
    const { user } = buildCareerTextPrompt("careerSummary", emptyInput());
    expect(user).toContain("## プロジェクト経歴\n(未登録)");
    expect(user).toContain("## スキル\n(未登録)");
    expect(user).toContain("## 資格\n(未登録)");
  });
});

describe("listMissingData", () => {
  it("すべて未登録なら3項目を返す", () => {
    expect(listMissingData(emptyInput())).toEqual([
      "projects",
      "skills",
      "certifications",
    ]);
  });

  it("登録済みの項目は含まれない", () => {
    const input = fullInput();
    input.certifications = [];
    expect(listMissingData(input)).toEqual(["certifications"]);
  });

  it("すべて登録済みなら空配列を返す", () => {
    expect(listMissingData(fullInput())).toEqual([]);
  });
});

describe("buildMissingDataMessage", () => {
  it("未登録項目のみを「・」区切りで列挙する", () => {
    expect(buildMissingDataMessage(["projects", "certifications"])).toBe(
      "経歴・資格を登録すると、より精度の高い文章を生成できます。",
    );
  });

  it("空配列ならnullを返す", () => {
    expect(buildMissingDataMessage([])).toBeNull();
  });
});
