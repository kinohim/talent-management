import { prisma } from "@/lib/prisma";

// ヘッダ等に表示する氏名を取得する。セッションのname(token.name)はログイン
// 時点のスナップショットで、EDT001での名前登録が反映されず、SSOログインでは
// そもそも設定されない(users.nameが空のまま)ため、employee.nameを都度参照する。
// 名前が未登録の間は社員IDを表示する。
export async function displayNameForEmployee(employeeId: string): Promise<string> {
  const employee = await prisma.employee.findUnique({
    where: { employeeId },
    select: { name: true },
  });
  return employee?.name ?? employeeId;
}
