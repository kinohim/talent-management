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

// docs/schema.md「employee.experience_months」: 全プロジェクト期間の和集合(重複期間は
// 1回)の月数。end_date=NULL(進行中)は`today`の年月まで含める。
// 年への切り捨てはせず月数のまま保存し、表示・検索側で年に換算する。
export function calculateExperienceMonths(
  projects: { startDate: Date; endDate: Date | null }[],
  today: Date,
): number {
  const intervals = projects.map((project) => ({
    startMonthIndex: toMonthIndex(project.startDate),
    endMonthIndex: toMonthIndex(project.endDate ?? today),
  }));

  return sumUnionMonths(intervals);
}

// 経験年数の表示用文言(REF003/REF004)。「◯年◯か月」。
// 端数のない側は省略する(0年3か月→「3か月」、5年0か月→「5年」、0か月→「0か月」)。
export function formatExperienceMonths(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest}か月`;
  if (rest === 0) return `${years}年`;
  return `${years}年${rest}か月`;
}

export async function recalculateExperienceMonths(
  tx: Prisma.TransactionClient,
  employeeId: string,
): Promise<void> {
  const projects = await tx.project.findMany({
    where: { employeeId, deletedAt: null },
    select: { startDate: true, endDate: true },
  });

  // 進行中案件の「今の年月」はJST基準で数える
  const experienceMonths = calculateExperienceMonths(projects, nowJstClock());

  await tx.employee.update({
    where: { employeeId },
    data: { experienceMonths },
  });
}
