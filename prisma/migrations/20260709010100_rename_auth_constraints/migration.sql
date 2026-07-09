-- AlterTable
ALTER TABLE "accounts" RENAME CONSTRAINT "account_pkey" TO "accounts_pkey";

-- AlterTable
ALTER TABLE "sessions" RENAME CONSTRAINT "session_pkey" TO "sessions_pkey";

-- AlterTable
ALTER TABLE "users" RENAME CONSTRAINT "user_account_pkey" TO "users_pkey";

-- RenameForeignKey
ALTER TABLE "accounts" RENAME CONSTRAINT "account_user_id_fkey" TO "accounts_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "sessions" RENAME CONSTRAINT "session_user_id_fkey" TO "sessions_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "users" RENAME CONSTRAINT "user_account_employee_id_fkey" TO "users_employee_id_fkey";

-- RenameIndex
ALTER INDEX "account_provider_provider_account_id_key" RENAME TO "accounts_provider_provider_account_id_key";

-- RenameIndex
ALTER INDEX "session_session_token_key" RENAME TO "sessions_session_token_key";

-- RenameIndex
ALTER INDEX "user_account_email_key" RENAME TO "users_email_key";

-- RenameIndex
ALTER INDEX "user_account_employee_id_key" RENAME TO "users_employee_id_key";

-- RenameIndex
ALTER INDEX "verification_token_identifier_token_key" RENAME TO "verification_tokens_identifier_token_key";

