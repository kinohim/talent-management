import "dotenv/config";

import {
  calculateExperienceMonths,
  recalculateExperienceMonths,
} from "../lib/experience-years";
import { prisma } from "../lib/prisma";

// 開発用ログイン(lib/auth.tsのdev-employee-idプロバイダ)で使うサンプルデータ。
// 本番投入は行わない。
//
// 中規模データセット(社員30名相当)。組織単位・スキル/資格/現場マスタを拡充し、
// 社員ごとに経歴・スキル・資格の充実度をわざと変えることで、検索・絞り込み・
// 集計・AI生成(未登録項目の動的メッセージ)など、データ量が前提の機能を
// 一通り確認できるようにする。

const actor = "SEED";
const program = "seed";
const audit = {
  createdBy: actor,
  createdProgram: program,
  updatedBy: actor,
  updatedProgram: program,
};

// ---------------------------------------------------------------------------
// 組織単位: 事業部2 → 部署12 → Gr18 の3階層
// ---------------------------------------------------------------------------

const divisionDefs = [
  { key: "si", name: "SI事業部" },
  { key: "cloud", name: "クラウド事業部" },
];

const departmentDefs = [
  { key: "mkt", name: "マーケティング戦略部", divisionKey: "si" },
  { key: "svc-sales", name: "サービス営業部", divisionKey: "si" },
  { key: "itc", name: "ITコンサルティング部", divisionKey: "si" },
  { key: "finance", name: "金融サービス部", divisionKey: "si" },
  { key: "dist", name: "流通サービス部", divisionKey: "si" },
  { key: "dx", name: "DXサービス部", divisionKey: "si" },
  { key: "erp", name: "ERPサービス部", divisionKey: "si" },
  { key: "sol", name: "ソリューション開発部", divisionKey: "si" },
  { key: "biz-mgmt", name: "事業統括部", divisionKey: "cloud" },
  { key: "hr-consult", name: "HRコンサルティング部", divisionKey: "cloud" },
  { key: "hr-sales", name: "HRセールス部", divisionKey: "cloud" },
  { key: "hr-svc", name: "HRサービス部", divisionKey: "cloud" },
];

const groupDefs = [
  { key: "pmo", name: "PMO Gr", departmentKey: "itc" },
  { key: "sec", name: "証券サービスGr", departmentKey: "finance" },
  { key: "fin", name: "金融サービスGr", departmentKey: "finance" },
  { key: "pay", name: "決済サービスGr", departmentKey: "finance" },
  { key: "tsuhan", name: "通販サービスGr", departmentKey: "dist" },
  { key: "ryutsu", name: "流通サービスGr", departmentKey: "dist" },
  { key: "retail", name: "リテールサービスGr", departmentKey: "dist" },
  { key: "infra", name: "インフラGr", departmentKey: "dx" },
  { key: "dxgr", name: "DXサービスGr", departmentKey: "dx" },
  { key: "devops", name: "DevOpsサービスGr", departmentKey: "dx" },
  { key: "erpgr", name: "ERPサービスGr", departmentKey: "erp" },
  { key: "mfg", name: "製造サービスGr", departmentKey: "sol" },
  { key: "dev", name: "開発サービスGr", departmentKey: "sol" },
  { key: "biz-promo", name: "事業推進Gr", departmentKey: "biz-mgmt" },
  { key: "sales-gr", name: "セールスGr", departmentKey: "hr-sales" },
  { key: "product-dev", name: "商品開発Gr", departmentKey: "hr-svc" },
  { key: "cs-success", name: "カスタマーサクセスGr", departmentKey: "hr-svc" },
  { key: "cs-support", name: "カスタマーサポートGr", departmentKey: "hr-svc" },
];

async function createOrganizationUnits(): Promise<Record<string, number>> {
  const orgUnitIdByKey: Record<string, number> = {};

  for (const d of divisionDefs) {
    const created = await prisma.organizationUnit.create({
      data: { unitName: d.name, unitLevel: "DIVISION", ...audit },
    });
    orgUnitIdByKey[d.key] = created.id;
  }
  for (const d of departmentDefs) {
    const created = await prisma.organizationUnit.create({
      data: {
        parentId: orgUnitIdByKey[d.divisionKey],
        unitName: d.name,
        unitLevel: "DEPARTMENT",
        ...audit,
      },
    });
    orgUnitIdByKey[d.key] = created.id;
  }
  for (const g of groupDefs) {
    const created = await prisma.organizationUnit.create({
      data: {
        parentId: orgUnitIdByKey[g.departmentKey],
        unitName: g.name,
        unitLevel: "GROUP",
        ...audit,
      },
    });
    orgUnitIdByKey[g.key] = created.id;
  }

  return orgUnitIdByKey;
}

// ---------------------------------------------------------------------------
// スキルマスタ: カテゴリ5 → スキル18(一部バージョンあり)
// ---------------------------------------------------------------------------

const skillCategoryDefs = [
  { key: "lang", name: "プログラミング言語" },
  { key: "framework", name: "フレームワーク" },
  { key: "infra", name: "インフラ・クラウド" },
  { key: "db", name: "データベース" },
  { key: "tool", name: "ツール・その他" },
];

const skillDefs = [
  { key: "java", name: "Java", categoryKey: "lang", versions: ["8", "11", "17"] },
  { key: "python", name: "Python", categoryKey: "lang" },
  { key: "typescript", name: "TypeScript", categoryKey: "lang" },
  { key: "go", name: "Go", categoryKey: "lang" },
  { key: "nextjs", name: "Next.js", categoryKey: "framework", versions: ["14", "15"] },
  { key: "springboot", name: "Spring Boot", categoryKey: "framework" },
  { key: "react", name: "React", categoryKey: "framework" },
  { key: "nuxtjs", name: "Nuxt.js", categoryKey: "framework" },
  { key: "aws", name: "AWS", categoryKey: "infra" },
  { key: "azure", name: "Azure", categoryKey: "infra" },
  { key: "gcp", name: "GCP", categoryKey: "infra" },
  { key: "docker", name: "Docker", categoryKey: "infra" },
  { key: "postgresql", name: "PostgreSQL", categoryKey: "db", versions: ["14", "16"] },
  { key: "mysql", name: "MySQL", categoryKey: "db", versions: ["5.7", "8.0"] },
  { key: "oracle", name: "Oracle Database", categoryKey: "db" },
  { key: "git", name: "Git", categoryKey: "tool" },
  { key: "jira", name: "Jira", categoryKey: "tool" },
  { key: "figma", name: "Figma", categoryKey: "tool" },
];

async function createSkillMasters(): Promise<{
  skillIds: Record<string, number>;
  skillVersionIds: Record<string, number[]>;
}> {
  const categoryIds: Record<string, number> = {};
  for (const c of skillCategoryDefs) {
    const created = await prisma.skillCategory.create({
      data: { skillCategoryName: c.name, ...audit },
    });
    categoryIds[c.key] = created.id;
  }

  const skillIds: Record<string, number> = {};
  const skillVersionIds: Record<string, number[]> = {};
  for (const s of skillDefs) {
    const created = await prisma.skill.create({
      data: {
        skillCategoryId: categoryIds[s.categoryKey],
        skillName: s.name,
        hasVersion: Boolean(s.versions),
        ...audit,
      },
    });
    skillIds[s.key] = created.id;

    if (s.versions) {
      skillVersionIds[s.key] = [];
      for (const versionName of s.versions) {
        const createdVersion = await prisma.skillVersion.create({
          data: {
            skillId: created.id,
            versionName,
            displayName: `${s.name} ${versionName}`,
            ...audit,
          },
        });
        skillVersionIds[s.key].push(createdVersion.id);
      }
    }
  }

  return { skillIds, skillVersionIds };
}

// ---------------------------------------------------------------------------
// 資格マスタ: カテゴリ3 → 資格10
// ---------------------------------------------------------------------------

const certificationCategoryDefs = [
  { key: "it", name: "IT系" },
  { key: "lang", name: "語学系" },
  { key: "biz", name: "ビジネス系" },
];

const certificationDefs = [
  { key: "fe", name: "基本情報技術者試験", org: "IPA", categoryKey: "it" },
  { key: "ap", name: "応用情報技術者試験", org: "IPA", categoryKey: "it" },
  {
    key: "awssaa",
    name: "AWS認定ソリューションアーキテクト",
    org: "Amazon Web Services",
    categoryKey: "it",
  },
  {
    key: "awsdva",
    name: "AWS認定デベロッパー",
    org: "Amazon Web Services",
    categoryKey: "it",
  },
  { key: "itil", name: "ITILファンデーション", org: "AXELOS", categoryKey: "it" },
  {
    key: "toeic",
    name: "TOEIC",
    org: "国際ビジネスコミュニケーション協会",
    categoryKey: "lang",
  },
  {
    key: "eiken",
    name: "実用英語技能検定準1級",
    org: "日本英語検定協会",
    categoryKey: "lang",
  },
  { key: "pmp", name: "PMP", org: "PMI", categoryKey: "biz" },
  { key: "boki", name: "日商簿記2級", org: "日本商工会議所", categoryKey: "biz" },
  {
    key: "itc",
    name: "ITコーディネータ",
    org: "ITコーディネータ協会",
    categoryKey: "biz",
  },
];

async function createCertificationMasters(): Promise<Record<string, number>> {
  const categoryIds: Record<string, number> = {};
  for (const c of certificationCategoryDefs) {
    const created = await prisma.certificationCategory.create({
      data: { certificationCategoryName: c.name, ...audit },
    });
    categoryIds[c.key] = created.id;
  }

  const certificationIds: Record<string, number> = {};
  for (const c of certificationDefs) {
    const created = await prisma.certification.create({
      data: {
        certificationCategoryId: categoryIds[c.categoryKey],
        certificationName: c.name,
        certificationOrganization: c.org,
        ...audit,
      },
    });
    certificationIds[c.key] = created.id;
  }

  return certificationIds;
}

// ---------------------------------------------------------------------------
// 現場マスタ8(+社外プロジェクト1)・現場ポジションマスタ5
// departmentKeyは主管部署(MST005で部のみ選択可・任意)。nullは主管部署なし
// ---------------------------------------------------------------------------

const siteDefs: { siteName: string; departmentKey: string | null }[] = [
  { siteName: "A社基幹システム更改", departmentKey: "finance" },
  { siteName: "B社ECサイト構築", departmentKey: "dist" },
  { siteName: "C社在庫管理システム刷新", departmentKey: "dist" },
  { siteName: "D社人事給与システム構築", departmentKey: "hr-svc" },
  { siteName: "E社モバイルアプリ開発", departmentKey: "sol" },
  { siteName: "F社データ基盤構築", departmentKey: "dx" },
  { siteName: "G社顧客管理システム刷新", departmentKey: null },
  { siteName: "H社決済システム開発", departmentKey: "finance" },
];

// 入社前(前職)の経歴を登録するための現場(docs/decisions.md「経験年数の計算」の
// 社外プロジェクト運用)。通常プロジェクトのローテーションには使わない
const externalSiteName = "社外プロジェクト";

const siteNames = siteDefs.map((s) => s.siteName);

const projectRoleNames = ["SE", "PG", "リーダー", "PM", "PL"];

const industries = ["IT", "金融", "小売", "製造", "医療"];

async function createSiteAndRoleMasters(
  orgUnitIdByKey: Record<string, number>,
): Promise<{
  siteIds: number[];
  externalSiteId: number;
  projectRoleIds: number[];
}> {
  const siteIds: number[] = [];
  for (const def of siteDefs) {
    const created = await prisma.site.create({
      data: {
        siteName: def.siteName,
        organizationUnitId: def.departmentKey
          ? orgUnitIdByKey[def.departmentKey]
          : null,
        ...audit,
      },
    });
    siteIds.push(created.id);
  }
  const externalSite = await prisma.site.create({
    data: { siteName: externalSiteName, ...audit },
  });

  const projectRoleIds: number[] = [];
  for (const projectRoleName of projectRoleNames) {
    const created = await prisma.projectRole.create({
      data: { projectRoleName, ...audit },
    });
    projectRoleIds.push(created.id);
  }

  return { siteIds, externalSiteId: externalSite.id, projectRoleIds };
}

// ---------------------------------------------------------------------------
// 社員ロースター(30名)
//
// bucket は経歴書データ(スキル・資格・プロジェクト経歴)の充実度:
// - "rich":     スキル3〜6件・資格1〜2件・プロジェクト2〜4件・経歴概要/自己PR登録済み
// - "skillsOnly" / "certsOnly" / "projectsOnly" / "skillsAndCerts": 一部のみ登録
//   (AI生成の「未登録項目のみ列挙」メッセージ確認用)
// - "empty":     経験年数以外すべて未登録(AI生成の全項目促しメッセージ確認用)
// - "none":      経歴書を持たない(人事・営業、または未登録者)
// ---------------------------------------------------------------------------

type ResumeBucket =
  | "rich"
  | "skillsOnly"
  | "certsOnly"
  | "projectsOnly"
  | "skillsAndCerts"
  | "empty"
  | "none";

type EmployeeSeed = {
  employeeId: string;
  name: string | null;
  nameKana: string | null;
  role: "EMPLOYEE" | "HR_SALES" | "MANAGER";
  employmentStatus: "ACTIVE" | "RETIRED";
  isRegistered: boolean;
  orgKey: string | null;
  email: string;
  bucket: ResumeBucket;
};

// 人名は「姓＝ロール(管理職/人事/一般/退職)」の架空名で統一し、
// ロールの見分けやすさと架空の人物であることを明確にする。
const employeeSeeds: EmployeeSeed[] = [
  // 管理職(3名)
  {
    employeeId: "000001",
    name: "管理職 太郎",
    nameKana: "カンリショク タロウ",
    role: "MANAGER",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "fin",
    email: "yamada@example.com",
    bucket: "rich",
  },
  {
    employeeId: "000007",
    name: "管理職 二郎",
    nameKana: "カンリショク ジロウ",
    role: "MANAGER",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "dxgr",
    email: "emp000007@example.com",
    bucket: "rich",
  },
  {
    employeeId: "000008",
    name: "管理職 三郎",
    nameKana: "カンリショク サブロウ",
    role: "MANAGER",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "svc-sales",
    email: "emp000008@example.com",
    bucket: "rich",
  },

  // 人事・営業(3名)
  {
    employeeId: "000003",
    name: "人事 次郎",
    nameKana: "ジンジ ジロウ",
    role: "HR_SALES",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "si",
    email: "sato@example.com",
    bucket: "none",
  },
  {
    employeeId: "000006",
    name: "人事 花子",
    nameKana: "ジンジ ハナコ",
    role: "HR_SALES",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "svc-sales",
    email: "ito@example.com",
    bucket: "none",
  },
  {
    employeeId: "000009",
    name: "人事 梅子",
    nameKana: "ジンジ ウメコ",
    role: "HR_SALES",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "finance",
    email: "emp000009@example.com",
    bucket: "none",
  },

  // 一般社員(在職・登録済み、18名)
  {
    employeeId: "000002",
    name: "一般 桜",
    nameKana: "イッパン サクラ",
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "fin",
    email: "suzuki@example.com",
    bucket: "rich",
  },
  {
    employeeId: "000010",
    name: "一般 一郎",
    nameKana: "イッパン イチロウ",
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "fin",
    email: "emp000010@example.com",
    bucket: "rich",
  },
  {
    employeeId: "000011",
    name: "一般 四郎",
    nameKana: "イッパン シロウ",
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "sec",
    email: "emp000011@example.com",
    bucket: "rich",
  },
  {
    employeeId: "000012",
    name: "一般 五郎",
    nameKana: "イッパン ゴロウ",
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "sec",
    email: "emp000012@example.com",
    bucket: "rich",
  },
  {
    employeeId: "000013",
    name: "一般 六郎",
    nameKana: "イッパン ロクロウ",
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "pay",
    email: "emp000013@example.com",
    bucket: "rich",
  },
  {
    employeeId: "000014",
    name: "一般 七郎",
    nameKana: "イッパン シチロウ",
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "ryutsu",
    email: "emp000014@example.com",
    bucket: "rich",
  },
  {
    employeeId: "000015",
    name: "一般 八郎",
    nameKana: "イッパン ハチロウ",
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "ryutsu",
    email: "emp000015@example.com",
    bucket: "rich",
  },
  {
    employeeId: "000016",
    name: "一般 九郎",
    nameKana: "イッパン クロウ",
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "tsuhan",
    email: "emp000016@example.com",
    bucket: "rich",
  },
  {
    employeeId: "000017",
    name: "一般 菊子",
    nameKana: "イッパン キクコ",
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "dxgr",
    email: "emp000017@example.com",
    bucket: "rich",
  },
  {
    employeeId: "000018",
    name: "一般 雪子",
    nameKana: "イッパン ユキコ",
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "product-dev",
    email: "emp000018@example.com",
    bucket: "rich",
  },
  {
    employeeId: "000019",
    name: "一般 月子",
    nameKana: "イッパン ツキコ",
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "erpgr",
    email: "emp000019@example.com",
    bucket: "rich",
  },
  {
    employeeId: "000020",
    name: "一般 星子",
    nameKana: "イッパン ホシコ",
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "sales-gr",
    email: "emp000020@example.com",
    bucket: "rich",
  },
  {
    employeeId: "000021",
    name: "一般 竹子",
    nameKana: "イッパン タケコ",
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "svc-sales",
    email: "emp000021@example.com",
    bucket: "rich",
  },
  {
    employeeId: "000022",
    name: "一般 松子",
    nameKana: "イッパン マツコ",
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "svc-sales",
    email: "emp000022@example.com",
    bucket: "rich",
  },
  {
    employeeId: "000023",
    name: "一般 藤子",
    nameKana: "イッパン フジコ",
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "pay",
    email: "emp000023@example.com",
    bucket: "skillsOnly",
  },
  {
    // 事業部直下所属(閲覧範囲判定ルールbの確認用)
    employeeId: "000024",
    name: "一般 十郎",
    nameKana: "イッパン ジュウロウ",
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "si",
    email: "emp000024@example.com",
    bucket: "certsOnly",
  },
  {
    // 事業部直下所属(閲覧範囲判定ルールbの確認用)
    employeeId: "000025",
    name: "一般 椿",
    nameKana: "イッパン ツバキ",
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: "cloud",
    email: "emp000025@example.com",
    bucket: "projectsOnly",
  },
  {
    // 未所属(閲覧範囲判定ルールcの確認用)
    employeeId: "000026",
    name: "一般 蘭",
    nameKana: "イッパン ラン",
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: true,
    orgKey: null,
    email: "emp000026@example.com",
    bucket: "empty",
  },

  // 一般社員(退職、3名)
  {
    employeeId: "000004",
    name: "退職 一郎",
    nameKana: "タイショク イチロウ",
    role: "EMPLOYEE",
    employmentStatus: "RETIRED",
    isRegistered: true,
    orgKey: "fin",
    email: "taishoku@example.com",
    bucket: "rich",
  },
  {
    employeeId: "000027",
    name: "退職 二郎",
    nameKana: "タイショク ジロウ",
    role: "EMPLOYEE",
    employmentStatus: "RETIRED",
    isRegistered: true,
    orgKey: "sec",
    email: "emp000027@example.com",
    bucket: "skillsAndCerts",
  },
  {
    employeeId: "000028",
    name: "退職 花子",
    nameKana: "タイショク ハナコ",
    role: "EMPLOYEE",
    employmentStatus: "RETIRED",
    isRegistered: true,
    orgKey: "svc-sales",
    email: "emp000028@example.com",
    bucket: "empty",
  },

  // 一般社員(未登録、3名)
  {
    employeeId: "000005",
    name: null,
    nameKana: null,
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: false,
    orgKey: "fin",
    email: "mitouroku@example.com",
    bucket: "none",
  },
  {
    employeeId: "000029",
    name: null,
    nameKana: null,
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: false,
    orgKey: "ryutsu",
    email: "emp000029@example.com",
    bucket: "none",
  },
  {
    employeeId: "000030",
    name: null,
    nameKana: null,
    role: "EMPLOYEE",
    employmentStatus: "ACTIVE",
    isRegistered: false,
    orgKey: "svc-sales",
    email: "emp000030@example.com",
    bucket: "none",
  },

  // 実メンバー(SSOログインの動作確認用)。メールアドレスのみ実在のもので、
  // 社員IDは900001からの連番。初回未登録(is_registered=false)のため氏名は
  // 本人のEDT001保存で登録する。全員管理職(ユーザー指示)
  ...(
    [
      "hiramoto@sas-com.com",
      "m_matsuda@sas-com.com",
      "kanazawa@sas-com.com",
      "h_kinoshita@sas-com.com",
      "s_anzo@sas-com.com",
      "inamura@sas-com.com",
      "shoji@sas-com.com",
    ] as const
  ).map((email, index) => ({
    employeeId: String(900001 + index),
    name: null,
    nameKana: null,
    role: "MANAGER" as const,
    employmentStatus: "ACTIVE" as const,
    isRegistered: false,
    orgKey: null,
    email,
    bucket: "none" as const,
  })),
];

async function createEmployees(
  orgUnitIdByKey: Record<string, number>,
): Promise<void> {
  const now = new Date();
  for (let i = 0; i < employeeSeeds.length; i++) {
    const e = employeeSeeds[i];
    await prisma.employee.create({
      data: {
        employeeId: e.employeeId,
        isRegistered: e.isRegistered,
        employmentStatus: e.employmentStatus,
        organizationUnitId: e.orgKey ? orgUnitIdByKey[e.orgKey] : null,
        name: e.name,
        nameKana: e.nameKana,
        ...audit,
      },
    });
    // 最終ログイン(REF007のソート・null末尾の確認用): 登録済み現職の
    // 3/4にばらつきのある日時を入れ、残りはnull(未ログイン「-」)にする
    const lastLoginAt =
      e.isRegistered && e.employmentStatus === "ACTIVE" && i % 4 !== 3
        ? new Date(now.getTime() - i * 7 * 60 * 60 * 1000)
        : null;
    await prisma.user.create({
      data: {
        employeeId: e.employeeId,
        email: e.email,
        role: e.role,
        lastLoginAt,
        ...audit,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// 経歴書データ(スキル・資格・プロジェクト経歴)の付与
// ---------------------------------------------------------------------------

function monthsAgo(now: Date, months: number): Date {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - months);
  d.setUTCDate(1);
  return d;
}

// count件のプロジェクト期間を、直近ほど新しくなる順で生成する。
// overlapSecond: 2件目の開始を1件目の終了に食い込ませ、経験年数の和集合計算
// (重複月は1回)を確認できるようにする。
// lastOngoing: 最後の1件のendDateをnull(現在進行中)にする。
function buildProjectPeriods(
  now: Date,
  count: number,
  options: { overlapSecond: boolean; lastOngoing: boolean },
): { startDate: Date; endDate: Date | null }[] {
  const periods: { startDate: Date; endDate: Date | null }[] = [];
  let monthsAgoCursor = count * 18;

  for (let p = 0; p < count; p++) {
    const durationMonths = 12 + (p % 3) * 6; // 12, 18, 24ヶ月
    const startMonthsAgo = monthsAgoCursor;
    monthsAgoCursor -= durationMonths;
    const isLast = p === count - 1;
    const endMonthsAgo = Math.max(monthsAgoCursor, 0);

    periods.push({
      startDate: monthsAgo(now, startMonthsAgo),
      endDate: isLast && options.lastOngoing ? null : monthsAgo(now, endMonthsAgo),
    });
  }

  if (options.overlapSecond && periods.length >= 2) {
    const firstEnd = periods[0].endDate ?? now;
    const overlappedStart = new Date(firstEnd);
    overlappedStart.setUTCMonth(overlappedStart.getUTCMonth() - 6);
    periods[1] = { ...periods[1], startDate: overlappedStart };
  }

  return periods;
}

function buildCareerSummaryText(
  name: string,
  years: number,
  skillNames: string[],
): string {
  const topSkills = skillNames.slice(0, 3).join("・") || "複数の技術";
  return `${name}です。${topSkills}を中心としたシステム開発に${years}年間従事してまいりました。要件定義から開発・テストまで幅広い工程を経験しています。`;
}

function buildSelfPrText(skillNames: string[]): string {
  const topSkills = skillNames.slice(0, 2).join("・") || "培った技術";
  return `私は${topSkills}を活かしたチーム開発を得意としています。技術的な課題に対して主体的に取り組み、チーム全体の生産性向上に貢献してきました。`;
}

async function assignResumeData(
  skillIds: Record<string, number>,
  skillVersionIds: Record<string, number[]>,
  certificationIds: Record<string, number>,
  siteIds: number[],
  projectRoleIds: number[],
): Promise<void> {
  const skillKeys = Object.keys(skillIds);
  const skillNameByKey = Object.fromEntries(
    skillDefs.map((s) => [s.key, s.name]),
  );
  const certKeys = Object.keys(certificationIds);
  const now = new Date();
  let projectCounter = 0;

  for (let i = 0; i < employeeSeeds.length; i++) {
    const e = employeeSeeds[i];
    if (e.bucket === "none") continue;

    const hasSkills =
      e.bucket === "rich" ||
      e.bucket === "skillsOnly" ||
      e.bucket === "skillsAndCerts";
    const hasCerts =
      e.bucket === "rich" ||
      e.bucket === "certsOnly" ||
      e.bucket === "skillsAndCerts";
    const hasProjects = e.bucket === "rich" || e.bucket === "projectsOnly";

    const employeeSkillKeys: string[] = [];
    if (hasSkills) {
      const count = e.bucket === "rich" ? 3 + (i % 4) : 2;
      for (let k = 0; k < count; k++) {
        const skillKey = skillKeys[(i + k) % skillKeys.length];
        employeeSkillKeys.push(skillKey);
        const versions = skillVersionIds[skillKey];
        const skillVersionId = versions ? versions[(i + k) % versions.length] : null;
        const level = (["EXPERT", "EXPERIENCED", "BASIC"] as const)[(i + k) % 3];
        await prisma.employeeSkill.create({
          data: {
            employeeId: e.employeeId,
            skillId: skillIds[skillKey],
            skillVersionId,
            skillLevel: level,
            ...audit,
          },
        });
      }
    }

    if (hasCerts) {
      const count = e.bucket === "rich" ? 1 + (i % 2) : 1;
      for (let k = 0; k < count; k++) {
        const certKey = certKeys[(i + k) % certKeys.length];
        const acquiredDate = new Date(Date.UTC(2018 + (i % 6), (i + k) % 12, 1));
        await prisma.employeeCertification.create({
          data: {
            employeeId: e.employeeId,
            certificationId: certificationIds[certKey],
            acquiredDate,
            ...audit,
          },
        });
      }
    }

    let projectPeriods: { startDate: Date; endDate: Date | null }[] = [];
    if (hasProjects) {
      const count = e.bucket === "rich" ? 2 + (i % 3) : 2;
      projectPeriods = buildProjectPeriods(now, count, {
        overlapSecond: i % 7 === 0,
        lastOngoing: i % 5 === 0,
      });

      for (let p = 0; p < projectPeriods.length; p++) {
        const siteIndex = projectCounter % siteIds.length;
        const roleId = projectRoleIds[projectCounter % projectRoleIds.length];
        const secondRoleId =
          projectRoleIds[(projectCounter + 1) % projectRoleIds.length];
        const industry = industries[projectCounter % industries.length];

        const project = await prisma.project.create({
          data: {
            employeeId: e.employeeId,
            siteId: siteIds[siteIndex],
            projectTitle: siteNames[siteIndex],
            industry,
            projectSummary: `${industry}業界向けシステムの開発プロジェクト。`,
            startDate: projectPeriods[p].startDate,
            endDate: projectPeriods[p].endDate,
            totalTeamSize: String(10 + (projectCounter % 20)),
            teamSize: String(2 + (projectCounter % 5)),
            ...audit,
          },
        });

        await prisma.projectDetail.create({
          data: {
            projectId: project.id,
            overview: `要件定義から${p % 2 === 0 ? "開発" : "テスト"}まで幅広く担当。`,
            researchAnalysis: p % 4 === 0,
            requirementsDefinition: p % 2 === 0,
            basicDesign: true,
            detailedDesign: true,
            development: true,
            testing: true,
            operation: p % 3 === 0,
            ...audit,
          },
        });

        await prisma.projectRoleLink.create({
          data: { projectId: project.id, projectRoleId: roleId, ...audit },
        });
        if (projectCounter % 2 === 0) {
          await prisma.projectRoleLink.create({
            data: { projectId: project.id, projectRoleId: secondRoleId, ...audit },
          });
        }

        const projectSkillKeys =
          employeeSkillKeys.length > 0
            ? [
                employeeSkillKeys[p % employeeSkillKeys.length],
                employeeSkillKeys[(p + 1) % employeeSkillKeys.length],
              ]
            : [skillKeys[projectCounter % skillKeys.length]];
        for (const skillKey of new Set(projectSkillKeys)) {
          await prisma.projectSkill.create({
            data: { projectId: project.id, skillId: skillIds[skillKey], ...audit },
          });
        }

        projectCounter++;
      }
    }

    const experienceMonths = calculateExperienceMonths(projectPeriods, now);

    if (e.bucket === "rich") {
      const skillNames = employeeSkillKeys.map((key) => skillNameByKey[key]);
      await prisma.employee.update({
        where: { employeeId: e.employeeId },
        data: {
          experienceMonths,
          careerSummary: buildCareerSummaryText(
            e.name ?? "",
            Math.floor(experienceMonths / 12),
            skillNames,
          ),
          selfPr: buildSelfPrText(skillNames),
        },
      });
    } else {
      await prisma.employee.update({
        where: { employeeId: e.employeeId },
        data: { experienceMonths },
      });
    }
  }
}

// 再実行できるよう、投入前に既存データを全削除する(FKの子→親の順)。
// 手動作成されたデータもすべて消えるため、seedは開発環境専用。
async function resetDatabase(): Promise<void> {
  await prisma.projectSkill.deleteMany();
  await prisma.projectRoleLink.deleteMany();
  await prisma.projectDetail.deleteMany();
  await prisma.project.deleteMany();
  await prisma.employeeSkill.deleteMany();
  await prisma.employeeCertification.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.skillVersion.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.skillCategory.deleteMany();
  await prisma.certification.deleteMany();
  await prisma.certificationCategory.deleteMany();
  await prisma.site.deleteMany();
  await prisma.projectRole.deleteMany();
  await prisma.organizationUnit.deleteMany();
}

// 社外プロジェクト運用(docs/decisions.md「経験年数の計算」)のサンプル:
// 「一般 一郎」に入社前(前職)の経歴を1件付与し、経験月数を再計算する。
// 同一社員×同一現場の複数プロジェクト許容の確認も兼ねる
async function assignExternalProjectSample(
  externalSiteId: number,
): Promise<void> {
  const employeeId = "000010";
  await prisma.project.create({
    data: {
      employeeId,
      siteId: externalSiteId,
      projectTitle: "前職: 受託開発(Webシステム保守)",
      industry: "IT",
      projectSummary: "前職で担当した受託Webシステムの保守・機能追加。",
      startDate: new Date(Date.UTC(2018, 3, 1)),
      endDate: new Date(Date.UTC(2019, 11, 31)),
      totalTeamSize: "8",
      teamSize: "3",
      ...audit,
    },
  });
  await recalculateExperienceMonths(prisma, employeeId);
}

async function main() {
  await resetDatabase();

  const orgUnitIdByKey = await createOrganizationUnits();
  const { skillIds, skillVersionIds } = await createSkillMasters();
  const certificationIds = await createCertificationMasters();
  const { siteIds, externalSiteId, projectRoleIds } =
    await createSiteAndRoleMasters(orgUnitIdByKey);

  await createEmployees(orgUnitIdByKey);
  await assignResumeData(
    skillIds,
    skillVersionIds,
    certificationIds,
    siteIds,
    projectRoleIds,
  );
  await assignExternalProjectSample(externalSiteId);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
