-- AlterTable
ALTER TABLE "InventoryUtilization" ADD COLUMN     "opportunityId" TEXT;

-- AddForeignKey
ALTER TABLE "InventoryUtilization" ADD CONSTRAINT "InventoryUtilization_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

