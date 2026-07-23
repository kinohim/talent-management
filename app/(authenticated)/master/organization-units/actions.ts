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

const PROGRAM = "master-org-units";
const PATH = "/master/organization-units";

// 組織単位名は「同一親の配下内」で一意とする(別の親の配下なら同名可。
// 例: 別事業部にそれぞれ「営業部」は許容)。親がNULL(事業部)の兄弟一意は
// DB制約で表現しづらいため、アプリ側の事前チェックで担保する(操作は
// 管理職のみの低頻度操作で、同時実行による競合は実質起きない)。
async function siblingNameExists(
  parentId: number | null,
  unitName: string,
  excludeId?: number,
): Promise<boolean> {
  const existing = await prisma.organizationUnit.findFirst({
    where: {
      parentId,
      unitName,
      deletedAt: null,
      ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  return existing !== null;
}

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

  if (await siblingNameExists(parentId, parsed.unitName)) {
    return { error: "同じ階層に同名の組織単位が既に存在します。" };
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

  const target = await prisma.organizationUnit.findFirst({
    where: { id: unitId, deletedAt: null },
    select: { parentId: true },
  });
  if (!target) {
    return { error: "組織単位が見つかりません。" };
  }
  if (await siblingNameExists(target.parentId, parsed.unitName, unitId)) {
    return { error: "同じ階層に同名の組織単位が既に存在します。" };
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
