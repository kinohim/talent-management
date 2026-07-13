-- AlterEnum
-- 手動修正: prisma migrate diffが生成する既定のUSING句は大文字値(DIVISION等)を
-- そのまま新しいenum(小文字ラベル)にキャストしようとして失敗するため、
-- lower()で小文字化してからキャストするよう修正している。
BEGIN;
CREATE TYPE "organization_unit_level_new" AS ENUM ('division', 'department', 'group');
ALTER TABLE "organization_unit" ALTER COLUMN "unit_level" TYPE "organization_unit_level_new" USING (lower("unit_level"::text)::"organization_unit_level_new");
ALTER TYPE "organization_unit_level" RENAME TO "organization_unit_level_old";
ALTER TYPE "organization_unit_level_new" RENAME TO "organization_unit_level";
DROP TYPE "public"."organization_unit_level_old";
COMMIT;
