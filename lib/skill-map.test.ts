import { describe, expect, it } from "vitest";

import {
  aggregateCertificationHolders,
  aggregateSkillHolders,
  parseSkillMapUnitId,
} from "./skill-map";

describe("parseSkillMapUnitId", () => {
  it("未指定ならnull", () => {
    expect(parseSkillMapUnitId({})).toBeNull();
  });

  it("空文字ならnull", () => {
    expect(parseSkillMapUnitId({ unitId: "" })).toBeNull();
  });

  it("数値文字列ならその数値", () => {
    expect(parseSkillMapUnitId({ unitId: "5" })).toBe(5);
  });

  it("整数でない値ならnull", () => {
    expect(parseSkillMapUnitId({ unitId: "abc" })).toBeNull();
    expect(parseSkillMapUnitId({ unitId: "1.5" })).toBeNull();
  });

  it("配列で渡された場合は先頭の値を使う", () => {
    expect(parseSkillMapUnitId({ unitId: ["3", "4"] })).toBe(3);
  });
});

describe("aggregateSkillHolders", () => {
  const categories = [
    { id: 1, skillCategoryName: "プログラミング言語" },
    { id: 2, skillCategoryName: "フレームワーク" },
  ];
  const skills = [
    { id: 10, skillName: "Java", skillCategoryId: 1 },
    { id: 11, skillName: "TypeScript", skillCategoryId: 1 },
    { id: 20, skillName: "Spring Boot", skillCategoryId: 2 },
  ];

  it("スキルごとに保有者を集約し、カテゴリ→スキル名→保有者名の順でソートする", () => {
    const employees = [
      { employeeId: "000002", name: "鈴木 花子", skillIds: [10, 11] },
      { employeeId: "000001", name: "山田 太郎", skillIds: [10] },
      { employeeId: "000003", name: "佐藤 次郎", skillIds: [20] },
    ];

    const result = aggregateSkillHolders(employees, skills, categories);

    expect(result).toEqual([
      {
        categoryId: 2,
        categoryName: "フレームワーク",
        skills: [
          {
            skillId: 20,
            skillName: "Spring Boot",
            holders: [{ employeeId: "000003", name: "佐藤 次郎" }],
          },
        ],
      },
      {
        categoryId: 1,
        categoryName: "プログラミング言語",
        skills: [
          {
            skillId: 10,
            skillName: "Java",
            holders: [
              { employeeId: "000001", name: "山田 太郎" },
              { employeeId: "000002", name: "鈴木 花子" },
            ],
          },
          {
            skillId: 11,
            skillName: "TypeScript",
            holders: [{ employeeId: "000002", name: "鈴木 花子" }],
          },
        ],
      },
    ]);
  });

  it("保有者0人のスキルは含めない", () => {
    const result = aggregateSkillHolders([], skills, categories);
    expect(result).toEqual([]);
  });

  it("マスタに存在しないskillIdは無視する(defensive)", () => {
    const employees = [{ employeeId: "000001", name: "山田 太郎", skillIds: [999] }];
    expect(aggregateSkillHolders(employees, skills, categories)).toEqual([]);
  });
});

describe("aggregateCertificationHolders", () => {
  const certifications = [
    { id: 1, certificationName: "基本情報技術者試験" },
    { id: 2, certificationName: "応用情報技術者試験" },
  ];

  it("資格ごとに保有者を集約し、資格名昇順のフラットリストで返す(カテゴリグルーピングなし)", () => {
    const employees = [
      { employeeId: "000002", name: "鈴木 花子", certificationIds: [1] },
      { employeeId: "000001", name: "山田 太郎", certificationIds: [1, 2] },
    ];

    const result = aggregateCertificationHolders(employees, certifications);

    expect(result).toEqual([
      {
        certificationId: 2,
        certificationName: "応用情報技術者試験",
        holders: [{ employeeId: "000001", name: "山田 太郎" }],
      },
      {
        certificationId: 1,
        certificationName: "基本情報技術者試験",
        holders: [
          { employeeId: "000001", name: "山田 太郎" },
          { employeeId: "000002", name: "鈴木 花子" },
        ],
      },
    ]);
  });

  it("保有者0人の資格は含めない", () => {
    expect(aggregateCertificationHolders([], certifications)).toEqual([]);
  });

  it("マスタに存在しないcertificationIdは無視する(defensive)", () => {
    const employees = [{ employeeId: "000001", name: "山田 太郎", certificationIds: [999] }];
    expect(aggregateCertificationHolders(employees, certifications)).toEqual([]);
  });
});
