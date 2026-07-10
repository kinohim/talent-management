import { skillLevelLabel } from "@/lib/employee-labels";
import { formatSkillWithVersion, type SkillCategoryGroup } from "@/lib/resume-view";

type ResumeSkillListProps = {
  groups: SkillCategoryGroup[];
};

export function ResumeSkillList({ groups }: ResumeSkillListProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">スキル一覧</h2>
      {groups.length === 0 ? (
        <p className="text-sm text-zinc-500">登録されているスキルはありません。</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.skillCategoryName} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-zinc-500">
                {group.skillCategoryName}
              </h3>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <li
                    key={`${item.skillName}-${item.versionName ?? ""}`}
                    className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                  >
                    <span>{formatSkillWithVersion(item.skillName, item.versionName)}</span>
                    <span>{skillLevelLabel(item.skillLevel)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
