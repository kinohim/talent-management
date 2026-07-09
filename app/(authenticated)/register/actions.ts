"use server";

import { redirect } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import {
  flattenFieldErrors,
  parseBasicInfoForm,
  type BasicInfoFieldErrors,
} from "@/lib/basic-info-schema";
import { parseDateOnly, parseYearMonth } from "@/lib/date-format";
import { resolveOrganizationUnitId } from "@/lib/organization-unit";
import { prisma } from "@/lib/prisma";

export type BasicInfoFormState = {
  fieldErrors: BasicInfoFieldErrors;
  formError: string | null;
};

export async function saveBasicInfo(
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
    return { fieldErrors: flattenFieldErrors(parsed.error), formError: null };
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

  // 保存後はREF004(マイページ)へ遷移する(docs/screens.md「保存後の遷移先
  // (共通ルール)」参照)。
  redirect("/mypage");
}
