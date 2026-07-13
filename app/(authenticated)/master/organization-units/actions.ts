"use server";

import { revalidatePath } from "next/cache";

import type { OrganizationUnitLevel } from "@/generated/prisma/client";
import { requireManager } from "@/lib/auth-guards";
import { getOrganizationUnitDeleteBlockReason } from "@/lib/organization-unit";
import { deriveChildLevel } from "@/lib/organization-unit-tree";
import {
  parseUnitNameForm,
  type OrganizationUnitFormState,
} from "@/lib/organization-unit-schema";
import { prisma } from "@/lib/prisma";

const PROGRAM = "MST004";
const PATH = "/master/organization-units";

export async function createOrganizationUnit(
  parentId: number | null,
  _prevState: OrganizationUnitFormState,
  formData: FormData,
): Promise<OrganizationUnitFormState> {
  const user = await requireManager();

  const parsed = parseUnitNameForm(formData);
  if (!parsed.success) {
    return { error: parsed.error };
  }

  let parentLevel: OrganizationUnitLevel | null = null;
  if (parentId !== null) {
    const parent = await prisma.organizationUnit.findFirst({
      where: { id: parentId, deletedAt: null },
      select: { unitLevel: true },
    });
    if (!parent) {
      return { error: "親の組織単位が見つかりません。" };
    }
    parentLevel = parent.unitLevel;
  }

  const childLevel = deriveChildLevel(parentLevel);
  if (!childLevel) {
    return { error: "これ以上、配下の組織単位を作成できません。" };
  }

  await prisma.organizationUnit.create({
    data: {
      parentId,
      unitName: parsed.unitName,
      unitLevel: childLevel,
      createdBy: user.employeeId,
      createdProgram: PROGRAM,
      updatedBy: user.employeeId,
      updatedProgram: PROGRAM,
    },
  });

  revalidatePath(PATH);
  return { error: null };
}

export async function renameOrganizationUnit(
  unitId: number,
  _prevState: OrganizationUnitFormState,
  formData: FormData,
): Promise<OrganizationUnitFormState> {
  const user = await requireManager();

  const parsed = parseUnitNameForm(formData);
  if (!parsed.success) {
    return { error: parsed.error };
  }

  await prisma.organizationUnit.update({
    where: { id: unitId },
    data: {
      unitName: parsed.unitName,
      updatedBy: user.employeeId,
      updatedProgram: PROGRAM,
    },
  });

  revalidatePath(PATH);
  return { error: null };
}

export async function deleteOrganizationUnit(
  unitId: number,
): Promise<{ error: string | null }> {
  const user = await requireManager();

  const blockReason = await getOrganizationUnitDeleteBlockReason(unitId);
  if (blockReason) {
    return { error: blockReason };
  }

  await prisma.organizationUnit.update({
    where: { id: unitId },
    data: {
      deletedAt: new Date(),
      deletedBy: user.employeeId,
      deletedProgram: PROGRAM,
    },
  });

  revalidatePath(PATH);
  return { error: null };
}
