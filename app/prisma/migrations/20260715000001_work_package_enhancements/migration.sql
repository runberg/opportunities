-- AlterTable: add new fields to AdhocDeliverable
ALTER TABLE "AdhocDeliverable"
    ADD COLUMN "internalId"          TEXT,
    ADD COLUMN "partiallyApprovedAt" TIMESTAMP(3),
    ADD COLUMN "approvedAt"          TIMESTAMP(3),
    ADD COLUMN "deliveredAt"         TIMESTAMP(3);

-- CreateIndex: unique internalId
CREATE UNIQUE INDEX "AdhocDeliverable_internalId_key" ON "AdhocDeliverable"("internalId");

-- Backfill internalId for existing records
-- Format: BT-AH-YYYYMMXXXX (4-digit year, 2-digit month, 4-digit global sequence per month)
WITH numbered AS (
    SELECT
        id,
        to_char("createdAt", 'YYYY') AS yr,
        to_char("createdAt", 'MM')   AS mo,
        ROW_NUMBER() OVER (
            PARTITION BY to_char("createdAt", 'YYYYMM')
            ORDER BY "createdAt", id
        ) AS seq
    FROM "AdhocDeliverable"
)
UPDATE "AdhocDeliverable" d
SET "internalId" = 'BT-AH-' || n.yr || n.mo || LPAD(n.seq::TEXT, 4, '0')
FROM numbered n
WHERE d.id = n.id;

-- AlterTable: make Comment.opportunityId nullable and add adhocDeliverableId
ALTER TABLE "Comment"
    ALTER COLUMN "opportunityId" DROP NOT NULL,
    ADD COLUMN "adhocDeliverableId" TEXT;

-- AddForeignKey: Comment -> AdhocDeliverable
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_adhocDeliverableId_fkey"
    FOREIGN KEY ("adhocDeliverableId") REFERENCES "AdhocDeliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint: every comment must belong to exactly one parent
ALTER TABLE "Comment" ADD CONSTRAINT "comment_must_have_parent"
    CHECK ("opportunityId" IS NOT NULL OR "adhocDeliverableId" IS NOT NULL);
