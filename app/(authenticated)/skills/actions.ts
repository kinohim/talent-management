"use server";

import { redirect } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSkillOptions, validateSkillRowsAgainstMaster } from "@/lib/skill-options";
import {
  parseSkillRowsForm,
  type SkillRowFieldErrors,
} from "@/lib/skill-schema";

export type SkillFormState = {
  rowErrors: Record<number, SkillRowFieldErrors>;
  formError: string | null;
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

  // 保存後はREF004(マイページ)へ遷移する(docs/screens.md「保存後の遷移先
  // (共通ルール)」参照)。
  redirect("/mypage");
}
