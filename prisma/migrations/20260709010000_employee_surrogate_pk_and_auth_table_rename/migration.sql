-- employee: サロゲートPK(id)を追加し、employee_idはFK参照用のUNIQUEカラムとして残す。
-- employee_pkeyには他4テーブルのFKが依存しているため、先にUNIQUE制約を追加してから
-- CASCADEでPK制約を落とし、PK再作成後にFK制約を張り直す(データを保持したまま安全に移行)。
ALTER TABLE "employee" ADD COLUMN "id" SERIAL NOT NULL;
ALTER TABLE "employee" ADD CONSTRAINT "employee_employee_id_key" UNIQUE ("employee_id");
ALTER TABLE "employee" DROP CONSTRAINT "employee_pkey" CASCADE;
ALTER TABLE "employee" ADD CONSTRAINT "employee_pkey" PRIMARY KEY ("id");

-- CASCADEで落ちた依存FK制約を再作成(参照先はemployee_idのまま。ON DELETE/UPDATE挙動は変更なし)
ALTER TABLE "employee_skill" ADD CONSTRAINT "employee_skill_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employee_certification" ADD CONSTRAINT "employee_certification_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project" ADD CONSTRAINT "project_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_account" ADD CONSTRAINT "user_account_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Auth.js標準のテーブル名(複数形)に合わせてリネーム(RENAMEのためデータは保持される)
ALTER TABLE "user_account" RENAME TO "users";
ALTER TABLE "account" RENAME TO "accounts";
ALTER TABLE "session" RENAME TO "sessions";
ALTER TABLE "verification_token" RENAME TO "verification_tokens";
