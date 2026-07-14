// REF004「私の経歴書」のタブ。URLの?tab=でリロード・戻り導線からも
// タブ位置を復元できるようにする。
export type MyResumeTab = "cover" | "projects";

export function parseMyResumeTab(
  value: string | string[] | undefined,
): MyResumeTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "projects" ? "projects" : "cover";
}
