import { skillLevelSymbol } from "@/lib/employee-labels";
import { formatSkillWithVersion, type SkillCategoryGroup } from "@/lib/resume-view";

type ResumeSkillListProps = {
  groups: SkillCategoryGroup[];
  // mypageではEditableSection側が見出しを出すため内部見出しを抑制する
  hideTitle?: boolean;
};

export function ResumeSkillList({ groups, hideTitle = false }: ResumeSkillListProps) {
  return (
    <section className="flex flex-col gap-4">
      {hideTitle ? null : (
        <h2 className="text-base font-semibold">スキル一覧</h2>
      )}
      {groups.length === 0 ? (
        <p className="text-sm text-zinc-500">登録されているスキルはありません。</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.skillCategoryName} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-zinc-500">
                {group.skillCategoryName}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <li
                    key={`${item.skillName}-${item.versionName ?? ""}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <span>
                      {formatSkillWithVersion(item.skillName, item.versionName)}
                    </span>
                    <span aria-hidden="true" className="text-zinc-500">
                      {skillLevelSymbol(item.skillLevel)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-xs text-zinc-500">
            習熟度: ◎ 得意 ／ ○ 経験あり ／ △ 基礎知識
          </p>
        </div>
      )}
    </section>
  );
}
