-- Postgres の NULLS NOT DISTINCT を適用するため、Prisma が生成した通常のUNIQUE INDEXを
-- 一旦削除し、同名・同カラムで NULLS NOT DISTINCT 付きとして再作成する。
-- (docs/decisions.md「スキル・資格・マスタ全般」参照。Prisma 7はスキーマでこの構文を
-- ネイティブサポートしないため、手動追記が唯一の例外として認められている)

DROP INDEX "employee_skill_employee_id_skill_id_skill_version_id_key";

CREATE UNIQUE INDEX "employee_skill_employee_id_skill_id_skill_version_id_key"
  ON "employee_skill" ("employee_id", "skill_id", "skill_version_id") NULLS NOT DISTINCT;

DROP INDEX "project_skill_project_id_skill_id_skill_version_id_key";

CREATE UNIQUE INDEX "project_skill_project_id_skill_id_skill_version_id_key"
  ON "project_skill" ("project_id", "skill_id", "skill_version_id") NULLS NOT DISTINCT;
