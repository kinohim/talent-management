/*
  Warnings:

  - A unique constraint covering the columns `[certification_category_name]` on the table `certification_category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[skill_category_name]` on the table `skill_category` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "certification_category_certification_category_name_key" ON "certification_category"("certification_category_name");

-- CreateIndex
CREATE UNIQUE INDEX "skill_category_skill_category_name_key" ON "skill_category"("skill_category_name");
