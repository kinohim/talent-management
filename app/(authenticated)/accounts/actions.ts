"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { EmploymentStatus } from "@/generated/prisma/client";
import {
  parseEditAccountForm,
  parseNewAccountForm,
  type EditAccountFormState,
  type NewAccountFormState,
} from "@/lib/account-schema";
import { requireManager } from "@/lib/auth-guards";
import { resolveOrganizationUnitId } from "@/lib/organization-unit";
import { isUniqueConstraintViolation } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";

const CREATE_PROGRAM = "EDT006";
const EDIT_PROGRAM = "EDT007";
const LIST_PATH = "/accounts";

function readOrganizationUnitSelection(formData: FormData) {
  return {
    divisionId: formData.get("divisionId")?.toString(),
    departmentId: formData.get("departmentId")?.toString(),
    groupId: formData.get("groupId")?.toString(),
  };
}

export async function createAccount(
  _prevState: NewAccountFormState,
  formData: FormData,
): Promise<NewAccountFormState> {
  const user = await requireManager();

  const parsed = parseNewAccountForm(formData);
  if (!parsed.success) {
    return { error: parsed.error };
  }
  const { employeeId, email, role } = parsed.data;

  const organizationUnitId = await resolveOrganizationUnitId(
    readOrganizationUnitSelection(formData),
  );

  try {
    await prisma.$transaction(async (tx) => {
      try {
        await tx.employee.create({
          data: {
            employeeId,
            organizationUnitId,
            employmentStatus: EmploymentStatus.ACTIVE,
            isRegistered: false,
            createdBy: user.employeeId,
            createdProgram: CREATE_PROGRAM,
            updatedBy: user.employeeId,
            updatedProgram: CREATE_PROGRAM,
          },
        });
      } catch (error) {
        if (isUniqueConstraintViolation(error)) throw new Error("DUPLICATE_EMPLOYEE_ID");
        throw error;
      }

      try {
        await tx.user.create({
          data: {
            employeeId,
            email,
            role,
            createdBy: user.employeeId,
            createdProgram: CREATE_PROGRAM,
            updatedBy: user.employeeId,
            updatedProgram: CREATE_PROGRAM,
          },
        });
      } catch (error) {
        if (isUniqueConstraintViolation(error)) throw new Error("DUPLICATE_EMAIL");
        throw error;
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_EMPLOYEE_ID") {
      return { error: "この社員IDは既に使用されています。" };
    }
    if (error instanceof Error && error.message === "DUPLICATE_EMAIL") {
      return { error: "このメールアドレスは既に使用されています。" };
    }
    return { error: "保存に失敗しました。時間をおいて再度お試しください。" };
  }

  // 保存後はREF007(アカウント一覧)へ戻る(docs/screens.md「保存後の遷移先」参照)。
  redirect(LIST_PATH);
}

export async function updateAccount(
  employeeId: string,
  _prevState: EditAccountFormState,
  formData: FormData,
): Promise<EditAccountFormState> {
  const user = await requireManager();

  const parsed = parseEditAccountForm(formData);
  if (!parsed.success) {
    return { error: parsed.error };
  }

  const organizationUnitId = await resolveOrganizationUnitId(
    readOrganizationUnitSelection(formData),
  );

  await prisma.$transaction([
    prisma.employee.update({
      where: { employeeId },
      data: {
        organizationUnitId,
        updatedBy: user.employeeId,
        updatedProgram: EDIT_PROGRAM,
      },
    }),
    prisma.user.update({
      where: { employeeId },
      data: {
        role: parsed.role,
        updatedBy: user.employeeId,
        updatedProgram: EDIT_PROGRAM,
      },
    }),
  ]);

  redirect(LIST_PATH);
}

export async function retireAccount(employeeId: string): Promise<void> {
  const user = await requireManager();

  await prisma.employee.update({
    where: { employeeId },
    data: {
      employmentStatus: EmploymentStatus.RETIRED,
      updatedBy: user.employeeId,
      updatedProgram: EDIT_PROGRAM,
    },
  });

  revalidatePath(`/accounts/${employeeId}`);
}

export async function reinstateAccount(employeeId: string): Promise<void> {
  const user = await requireManager();

  await prisma.employee.update({
    where: { employeeId },
    data: {
      employmentStatus: EmploymentStatus.ACTIVE,
      updatedBy: user.employeeId,
      updatedProgram: EDIT_PROGRAM,
    },
  });

  revalidatePath(`/accounts/${employeeId}`);
}
