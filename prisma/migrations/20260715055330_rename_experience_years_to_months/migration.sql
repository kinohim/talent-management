/*
  Warnings:

  - You are about to drop the column `experience_years` on the `employee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "employee" DROP COLUMN "experience_years",
ADD COLUMN     "experience_months" INTEGER;
