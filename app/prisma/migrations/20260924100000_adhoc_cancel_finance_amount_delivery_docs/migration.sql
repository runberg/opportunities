-- AlterEnum
ALTER TYPE "AdhocDeliverableStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'DELIVERY';

-- AlterTable
ALTER TABLE "AdhocDeliverable" ADD COLUMN     "financeAmount" DECIMAL(10,2);

