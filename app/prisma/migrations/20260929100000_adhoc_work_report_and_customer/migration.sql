-- AlterEnum
ALTER TYPE "AdhocDocumentType" ADD VALUE 'WORK_REPORT';

-- AlterTable
ALTER TABLE "AdhocDeliverable" ADD COLUMN     "customer" TEXT;
