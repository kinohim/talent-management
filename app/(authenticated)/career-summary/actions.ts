"use server";

import { redirect } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import {
  flattenFieldErrors,
  parseCareerSummaryForm,
  type CareerSummaryFieldErrors,
} from "@/lib/career-summary-schema";
import { prisma } from "@/lib/prisma";

export type CareerSummaryFormState = {
  fieldErrors: CareerSummaryFieldErrors;
  formError: string | null;
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
    return { fieldErrors: flattenFieldErrors(parsed.error), formError: null };
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

  // 保存後はREF004(マイページ)へ遷移する(docs/screens.md「保存後の遷移先
  // (共通ルール)」参照)。
  redirect("/mypage");
}
