import type { Prisma } from "@/generated/prisma/client";

import { nowJstClock } from "@/lib/date-format";

export type MonthInterval = {
  startMonthIndex: number;
  endMonthIndex: number;
};

// 年月をUTC基準の通し月数(西暦0年1月=0)に変換する。
export function toMonthIndex(date: Date): number {
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

// 区間の和集合(重複月は1回)の合計月数を返す。区間は両端を含む。
export function sumUnionMonths(intervals: MonthInterval[]): number {
  if (intervals.length === 0) return 0;

  const sorted = [...intervals].sort(
    (a, b) => a.startMonthIndex - b.startMonthIndex,
  );

  let total = 0;
  let curStart = sorted[0].startMonthIndex;
  let curEnd = sorted[0].endMonthIndex;

  for (let i = 1; i < sorted.length; i++) {
    const { startMonthIndex, endMonthIndex } = sorted[i];
    if (startMonthIndex <= curEnd) {
      curEnd = Math.max(curEnd, endMonthIndex);
    } else {
      total += curEnd - curStart + 1;
      curStart = startMonthIndex;
      curEnd = endMonthIndex;
    }
  }
  total += curEnd - curStart + 1;

  return total;
}

// docs/schema.md「employee.experience_years」: 全プロジェクト期間の和集合(重複期間は
// 1回)を月数換算し、12で割った整数部(切り捨て)。end_date=NULL(進行中)は`today`の
// 年月まで含める。
export function calculateExperienceYears(
  projects: { startDate: Date; endDate: Date | null }[],
  today: Date,
): number {
  const intervals = projects.map((project) => ({
    startMonthIndex: toMonthIndex(project.startDate),
    endMonthIndex: toMonthIndex(project.endDate ?? today),
  }));

  return Math.floor(sumUnionMonths(intervals) / 12);
}

export async function recalculateExperienceYears(
  tx: Prisma.TransactionClient,
  employeeId: string,
): Promise<void> {
  const projects = await tx.project.findMany({
    where: { employeeId, deletedAt: null },
    select: { startDate: true, endDate: true },
  });

  // 進行中案件の「今の年月」はJST基準で数える
  const experienceYears = calculateExperienceYears(projects, nowJstClock());

  await tx.employee.update({
    where: { employeeId },
    data: { experienceYears },
  });
}
