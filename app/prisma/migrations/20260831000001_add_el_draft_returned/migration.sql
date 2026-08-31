-- AlterEnum
ALTER TYPE "OpportunityStatus" ADD VALUE 'EL_DRAFT_RETURNED';

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "elDraftReturnedDate" TIMESTAMP(3);
