"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import {
  flattenFieldErrors as flattenBasicInfoFieldErrors,
  parseBasicInfoForm,
  type BasicInfoFieldErrors,
} from "@/lib/basic-info-schema";
import {
  flattenFieldErrors as flattenCareerSummaryFieldErrors,
  parseCareerSummaryForm,
  type CareerSummaryFieldErrors,
} from "@/lib/career-summary-schema";
import {
  getCertificationOptions,
  validateCertificationRowsAgainstMaster,
} from "@/lib/certification-options";
import {
  parseCertificationRowsForm,
  type CertificationRowFieldErrors,
} from "@/lib/certification-schema";
import { parseDateOnly, parseYearMonth } from "@/lib/date-format";
import { resolveOrganizationUnitId } from "@/lib/organization-unit";
import { prisma } from "@/lib/prisma";
import { getSkillOptions, validateSkillRowsAgainstMaster } from "@/lib/skill-options";
import {
  parseSkillRowsForm,
  type SkillRowFieldErrors,
} from "@/lib/skill-schema";

// REF004「私の経歴書」のセクション単位保存のServer Action群。
// 保存成功時はリダイレクトせず`saved: true`を返し、`revalidatePath("/mypage")`で
// 同一画面のサーバーデータを更新する(フォーム側が`saved`を検知して
// セクションの編集モードを解除する)。
// 例外はEDT001(基本情報)の初回登録(variant="register")で、従来どおり
// REF004へ遷移する(docs/screens.md「保存後の遷移先(共通ルール)」参照)。

const MYPAGE_PATH = "/mypage";

export type BasicInfoFormState = {
  fieldErrors: BasicInfoFieldErrors;
  formError: string | null;
  saved?: boolean;
};

export type BasicInfoFormVariant = "register" | "section";

export async function saveBasicInfo(
  variant: BasicInfoFormVariant,
  _prevState: BasicInfoFormState,
  formData: FormData,
): Promise<BasicInfoFormState> {
  const session = await auth();
  if (!session?.user || session.user.role === UserRole.HR_SALES) {
    // 人事・営業や未ログインでの直接アクセスは想定外の防御的分岐
    redirect("/login");
  }

  const parsed = parseBasicInfoForm(formData);
  if (!parsed.success) {
    return {
      fieldErrors: flattenBasicInfoFieldErrors(parsed.error),
      formError: null,
    };
  }

  const organizationUnitId = await resolveOrganizationUnitId(parsed.data);

  try {
    await prisma.employee.update({
      where: { employeeId: session.user.employeeId },
      data: {
        name: parsed.data.name,
        nameKana: parsed.data.nameKana,
        birthDate: parseDateOnly(parsed.data.birthDate),
        gender: parsed.data.gender ?? null,
        organizationUnitId,
        nearestStationLine: parsed.data.nearestStationLine ?? null,
        nearestStationName: parsed.data.nearestStationName ?? null,
        finalSchoolType: parsed.data.finalSchoolType ?? null,
        finalSchoolName: parsed.data.finalSchoolName ?? null,
        finalDepartmentName: parsed.data.finalDepartmentName ?? null,
        graduationStatus: parsed.data.graduationStatus ?? null,
        graduationYearMonth: parsed.data.graduationYearMonth
          ? parseYearMonth(parsed.data.graduationYearMonth)
          : null,
        isRegistered: true,
        updatedBy: session.user.employeeId,
        updatedProgram: "EDT001",
      },
    });
  } catch {
    return {
      fieldErrors: {},
      formError: "保存に失敗しました。時間をおいて再度お試しください。",
    };
  }

  if (variant === "register") {
    // 初回登録(EDT001単独画面)からの保存はREF004へ遷移する
    redirect(MYPAGE_PATH);
  }

  revalidatePath(MYPAGE_PATH);
  return { fieldErrors: {}, formError: null, saved: true };
}

export type CareerSummaryFormState = {
  fieldErrors: CareerSummaryFieldErrors;
  formError: string | null;
  saved?: boolean;
};

export async function saveCareerSummary(
  _prevState: CareerSummaryFormState,
  formData: FormData,
): Promise<CareerSummaryFormState> {
  const session = await auth();
  if (!session?.user || session.user.role === UserRole.HR_SALES) {
    // 人事・営業や未ログインでの直接アクセスは想定外の防御的分岐
    redirect("/login");
  }

  const parsed = parseCareerSummaryForm(formData);
  if (!parsed.success) {
    return {
      fieldErrors: flattenCareerSummaryFieldErrors(parsed.error),
      formError: null,
    };
  }

  try {
    await prisma.employee.update({
      where: { employeeId: session.user.employeeId },
      data: {
        careerSummary: parsed.data.careerSummary ?? null,
        selfPr: parsed.data.selfPr ?? null,
        updatedBy: session.user.employeeId,
        updatedProgram: "EDT002",
      },
    });
  } catch {
    return {
      fieldErrors: {},
      formError: "保存に失敗しました。時間をおいて再度お試しください。",
    };
  }

  revalidatePath(MYPAGE_PATH);
  return { fieldErrors: {}, formError: null, saved: true };
}

export type SkillFormState = {
  rowErrors: Record<number, SkillRowFieldErrors>;
  formError: string | null;
  saved?: boolean;
};

export async function saveSkills(
  _prevState: SkillFormState,
  formData: FormData,
): Promise<SkillFormState> {
  const session = await auth();
  if (!session?.user || session.user.role === UserRole.HR_SALES) {
    // 人事・営業や未ログインでの直接アクセスは想定外の防御的分岐
    redirect("/login");
  }

  const parsed = parseSkillRowsForm(formData);
  if (!parsed.success) {
    return { rowErrors: parsed.rowErrors, formError: parsed.formError };
  }

  const options = await getSkillOptions();
  const masterError = validateSkillRowsAgainstMaster(parsed.rows, options);
  if (masterError) {
    return { rowErrors: {}, formError: masterError };
  }

  const employeeId = session.user.employeeId;

  try {
    await prisma.$transaction([
      prisma.employeeSkill.deleteMany({ where: { employeeId } }),
      prisma.employeeSkill.createMany({
        data: parsed.rows.map((row) => ({
          employeeId,
          skillId: Number(row.skillId),
          skillVersionId: row.skillVersionId ? Number(row.skillVersionId) : null,
          skillLevel: row.skillLevel,
          createdBy: employeeId,
          createdProgram: "EDT003",
          updatedBy: employeeId,
          updatedProgram: "EDT003",
        })),
      }),
    ]);
  } catch {
    return {
      rowErrors: {},
      formError: "保存に失敗しました。時間をおいて再度お試しください。",
    };
  }

  revalidatePath(MYPAGE_PATH);
  return { rowErrors: {}, formError: null, saved: true };
}

export type CertificationFormState = {
  rowErrors: Record<number, CertificationRowFieldErrors>;
  formError: string | null;
  saved?: boolean;
};

export async function saveCertifications(
  _prevState: CertificationFormState,
  formData: FormData,
): Promise<CertificationFormState> {
  const session = await auth();
  if (!session?.user || session.user.role === UserRole.HR_SALES) {
    // 人事・営業や未ログインでの直接アクセスは想定外の防御的分岐
    redirect("/login");
  }

  const parsed = parseCertificationRowsForm(formData);
  if (!parsed.success) {
    return { rowErrors: parsed.rowErrors, formError: parsed.formError };
  }

  const options = await getCertificationOptions();
  const masterError = validateCertificationRowsAgainstMaster(
    parsed.rows,
    options,
  );
  if (masterError) {
    return { rowErrors: {}, formError: masterError };
  }

  const employeeId = session.user.employeeId;

  try {
    await prisma.$transaction([
      prisma.employeeCertification.deleteMany({ where: { employeeId } }),
      prisma.employeeCertification.createMany({
        data: parsed.rows.map((row) => ({
          employeeId,
          certificationId: Number(row.certificationId),
          acquiredDate: parseDateOnly(row.acquiredDate),
          expirationDate: row.expirationDate
            ? parseDateOnly(row.expirationDate)
            : null,
          createdBy: employeeId,
          createdProgram: "EDT004",
          updatedBy: employeeId,
          updatedProgram: "EDT004",
        })),
      }),
    ]);
  } catch {
    return {
      rowErrors: {},
      formError: "保存に失敗しました。時間をおいて再度お試しください。",
    };
  }

  revalidatePath(MYPAGE_PATH);
  return { rowErrors: {}, formError: null, saved: true };
}
