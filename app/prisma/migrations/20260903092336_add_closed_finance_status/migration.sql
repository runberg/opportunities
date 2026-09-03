-- AlterEnum
ALTER TYPE "AdhocDeliverableStatus" ADD VALUE 'CLOSED_FINANCE';

-- AlterTable
ALTER TABLE "AdhocDeliverable" ADD COLUMN     "closedFinanceAt" TIMESTAMP(3),
ADD COLUMN     "closedFinanceNote" TEXT;

