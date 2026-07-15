-- AlterTable
ALTER TABLE "site" ADD COLUMN     "organization_unit_id" INTEGER;

-- AddForeignKey
ALTER TABLE "site" ADD CONSTRAINT "site_organization_unit_id_fkey" FOREIGN KEY ("organization_unit_id") REFERENCES "organization_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
