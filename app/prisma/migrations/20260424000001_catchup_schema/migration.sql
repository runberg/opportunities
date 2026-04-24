-- Catch-up migration: align database with current Prisma schema.
-- All changes between the initial migration and the current schema.prisma
-- that were previously applied via `prisma db push` during development.

-- ── OpportunityStatus enum ────────────────────────────────────────────────────
ALTER TYPE "OpportunityStatus" ADD VALUE IF NOT EXISTS 'EL_REQUEST_RECEIVED';
ALTER TYPE "OpportunityStatus" ADD VALUE IF NOT EXISTS 'EL_DRAFT_SHARED';
ALTER TYPE "OpportunityStatus" ADD VALUE IF NOT EXISTS 'EL_SIGNED_SHARED';
ALTER TYPE "OpportunityStatus" ADD VALUE IF NOT EXISTS 'EL_FULLY_SIGNED';
ALTER TYPE "OpportunityStatus" ADD VALUE IF NOT EXISTS 'PENDING_ADVANCE_PAYMENT';
ALTER TYPE "OpportunityStatus" ADD VALUE IF NOT EXISTS 'IN_PRODUCTION';
ALTER TYPE "OpportunityStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "OpportunityStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- ── DocumentType enum ─────────────────────────────────────────────────────────
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'FAT';
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'SAT';

-- ── Opportunity: new columns ──────────────────────────────────────────────────
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "internalId"          TEXT;
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "rfqDate"             TIMESTAMP(3);
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "quoteSentDate"       TIMESTAMP(3);
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "elRequestedDate"     TIMESTAMP(3);
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "elDraftSharedDate"   TIMESTAMP(3);
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "elSignedSharedDate"  TIMESTAMP(3);
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "elCountersignedDate" TIMESTAMP(3);
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "advancePaymentDate"  TIMESTAMP(3);
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "fatDate"             TIMESTAMP(3);
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "fatPassedDate"       TIMESTAMP(3);
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "satApplicable"       BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "satDate"             TIMESTAMP(3);
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "satPassedDate"       TIMESTAMP(3);
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "deliveredDate"       TIMESTAMP(3);

-- ── Opportunity: fix waitingOn default (NONE → INTERNAL) ─────────────────────
ALTER TABLE "Opportunity" ALTER COLUMN "waitingOn" SET DEFAULT 'INTERNAL';

-- ── Opportunity: drop legacy columns removed from schema ──────────────────────
ALTER TABLE "Opportunity" DROP COLUMN IF EXISTS "value";
ALTER TABLE "Opportunity" DROP COLUMN IF EXISTS "currency";

-- ── Comment: add system flag ──────────────────────────────────────────────────
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "system" BOOLEAN NOT NULL DEFAULT false;

-- ── Comment: make authorId nullable (system events have no author) ────────────
ALTER TABLE "Comment" ALTER COLUMN "authorId" DROP NOT NULL;
ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_authorId_fkey";
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
