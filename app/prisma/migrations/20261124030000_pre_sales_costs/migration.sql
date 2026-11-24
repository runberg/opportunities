CREATE TABLE "PreSalesCost" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "estimatedAmount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PreSalesCost_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PreSalesCost_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PreSalesCost_estimatedAmount_check" CHECK ("estimatedAmount" >= 0)
);
CREATE INDEX "PreSalesCost_opportunityId_idx" ON "PreSalesCost"("opportunityId");
