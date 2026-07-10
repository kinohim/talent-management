import { describe, expect, it } from "vitest";

import type { CertificationOptions } from "./certification-options";
import { validateCertificationRowsAgainstMaster } from "./certification-options";
import type { CertificationRowInput } from "./certification-schema";

const options: CertificationOptions = {
  categories: [{ id: 1, certificationCategoryName: "IT系" }],
  certifications: [
    {
      id: 10,
      certificationCategoryId: 1,
      certificationName: "基本情報技術者試験",
      certificationOrganization: "IPA",
    },
    {
      id: 11,
      certificationCategoryId: 1,
      certificationName: "AWS認定ソリューションアーキテクト",
      certificationOrganization: "AWS",
    },
  ],
};

function row(overrides: Partial<CertificationRowInput>): CertificationRowInput {
  return {
    certificationCategoryId: "1",
    certificationId: "10",
    acquiredDate: "2020-01-01",
    expirationDate: undefined,
    ...overrides,
  };
}

describe("validateCertificationRowsAgainstMaster", () => {
  it("マスタに整合する行はnullを返す", () => {
    expect(
      validateCertificationRowsAgainstMaster([row({})], options),
    ).toBeNull();
  });

  it("存在しないカテゴリIDは弾く", () => {
    const result = validateCertificationRowsAgainstMaster(
      [row({ certificationCategoryId: "999" })],
      options,
    );
    expect(result).toBe("選択されたカテゴリが見つかりません。");
  });

  it("存在しない資格IDは弾く", () => {
    const result = validateCertificationRowsAgainstMaster(
      [row({ certificationId: "999" })],
      options,
    );
    expect(result).toBe("選択された資格が見つかりません。");
  });

  it("カテゴリと資格の親子関係が一致しなければ弾く", () => {
    const mismatched: CertificationOptions = {
      ...options,
      categories: [...options.categories, { id: 2, certificationCategoryName: "その他" }],
    };
    const result = validateCertificationRowsAgainstMaster(
      [row({ certificationCategoryId: "2", certificationId: "10" })],
      mismatched,
    );
    expect(result).toBe("選択された資格が見つかりません。");
  });
});
