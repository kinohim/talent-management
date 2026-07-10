import "dotenv/config";

import { prisma } from "../lib/prisma";

// 開発用ログイン(lib/auth.tsのdev-employee-idプロバイダ)で使うサンプルデータ。
// 本番投入は行わない。

const actor = "SEED";
const program = "seed";
const audit = {
  createdBy: actor,
  createdProgram: program,
  updatedBy: actor,
  updatedProgram: program,
};

async function main() {
  const division = await prisma.organizationUnit.create({
    data: { unitName: "システム事業部", unitLevel: "DIVISION", ...audit },
  });
  const department = await prisma.organizationUnit.create({
    data: {
      parentId: division.id,
      unitName: "開発部",
      unitLevel: "DEPARTMENT",
      ...audit,
    },
  });
  const group = await prisma.organizationUnit.create({
    data: {
      parentId: department.id,
      unitName: "第一Gr",
      unitLevel: "GROUP",
      ...audit,
    },
  });

  const activeEmployees = [
    {
      employeeId: "000001",
      name: "山田 太郎",
      nameKana: "ヤマダ タロウ",
      role: "MANAGER" as const,
      email: "yamada@example.com",
      organizationUnitId: group.id,
    },
    {
      employeeId: "000002",
      name: "鈴木 花子",
      nameKana: "スズキ ハナコ",
      role: "EMPLOYEE" as const,
      email: "suzuki@example.com",
      organizationUnitId: group.id,
    },
    {
      employeeId: "000003",
      name: "佐藤 次郎",
      nameKana: "サトウ ジロウ",
      role: "HR_SALES" as const,
      email: "sato@example.com",
      organizationUnitId: division.id,
    },
  ];

  for (const e of activeEmployees) {
    await prisma.employee.create({
      data: {
        employeeId: e.employeeId,
        isRegistered: true,
        organizationUnitId: e.organizationUnitId,
        name: e.name,
        nameKana: e.nameKana,
        ...audit,
      },
    });
    await prisma.user.create({
      data: {
        employeeId: e.employeeId,
        email: e.email,
        role: e.role,
        ...audit,
      },
    });
  }

  // 退職済みアカウント(ログイン不可・一覧除外の動作確認用)
  await prisma.employee.create({
    data: {
      employeeId: "000004",
      isRegistered: true,
      employmentStatus: "RETIRED",
      organizationUnitId: group.id,
      name: "退職 一郎",
      nameKana: "タイショク イチロウ",
      ...audit,
    },
  });
  await prisma.user.create({
    data: {
      employeeId: "000004",
      email: "taishoku@example.com",
      role: "EMPLOYEE",
      ...audit,
    },
  });

  // 未登録アカウント(EDT001初回登録導線・AUTH001初回ログイン分岐の動作確認用)
  await prisma.employee.create({
    data: {
      employeeId: "000005",
      isRegistered: false,
      organizationUnitId: group.id,
      ...audit,
    },
  });
  await prisma.user.create({
    data: {
      employeeId: "000005",
      email: "mitouroku@example.com",
      role: "EMPLOYEE",
      ...audit,
    },
  });

  // 未登録の人事・営業(初回ログインでisRegisteredが自動TRUEになる導線の確認用)
  await prisma.employee.create({
    data: {
      employeeId: "000006",
      isRegistered: false,
      organizationUnitId: division.id,
      ...audit,
    },
  });
  await prisma.user.create({
    data: {
      employeeId: "000006",
      email: "jinjieigyo@example.com",
      role: "HR_SALES",
      ...audit,
    },
  });

  // EDT003(スキル登録)の動作確認用スキルマスタ
  const languageCategory = await prisma.skillCategory.create({
    data: { skillCategoryName: "プログラミング言語", ...audit },
  });
  const frameworkCategory = await prisma.skillCategory.create({
    data: { skillCategoryName: "フレームワーク", ...audit },
  });

  const java = await prisma.skill.create({
    data: {
      skillCategoryId: languageCategory.id,
      skillName: "Java",
      hasVersion: true,
      ...audit,
    },
  });
  for (const versionName of ["8", "11", "17"]) {
    await prisma.skillVersion.create({
      data: {
        skillId: java.id,
        versionName,
        displayName: `Java ${versionName}`,
        ...audit,
      },
    });
  }
  await prisma.skill.create({
    data: {
      skillCategoryId: languageCategory.id,
      skillName: "Python",
      ...audit,
    },
  });
  await prisma.skill.create({
    data: {
      skillCategoryId: languageCategory.id,
      skillName: "TypeScript",
      ...audit,
    },
  });

  const nextjs = await prisma.skill.create({
    data: {
      skillCategoryId: frameworkCategory.id,
      skillName: "Next.js",
      hasVersion: true,
      ...audit,
    },
  });
  for (const versionName of ["14", "15"]) {
    await prisma.skillVersion.create({
      data: {
        skillId: nextjs.id,
        versionName,
        displayName: `Next.js ${versionName}`,
        ...audit,
      },
    });
  }
  await prisma.skill.create({
    data: {
      skillCategoryId: frameworkCategory.id,
      skillName: "Spring Boot",
      ...audit,
    },
  });

  // EDT004(資格登録)の動作確認用資格マスタ
  const itCertificationCategory = await prisma.certificationCategory.create({
    data: { certificationCategoryName: "IT系", ...audit },
  });
  const languageCertificationCategory = await prisma.certificationCategory.create({
    data: { certificationCategoryName: "語学系", ...audit },
  });

  await prisma.certification.create({
    data: {
      certificationCategoryId: itCertificationCategory.id,
      certificationName: "基本情報技術者試験",
      certificationOrganization: "IPA",
      ...audit,
    },
  });
  await prisma.certification.create({
    data: {
      certificationCategoryId: itCertificationCategory.id,
      certificationName: "AWS認定ソリューションアーキテクト",
      certificationOrganization: "Amazon Web Services",
      ...audit,
    },
  });
  await prisma.certification.create({
    data: {
      certificationCategoryId: languageCertificationCategory.id,
      certificationName: "TOEIC",
      certificationOrganization: "国際ビジネスコミュニケーション協会",
      ...audit,
    },
  });
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
