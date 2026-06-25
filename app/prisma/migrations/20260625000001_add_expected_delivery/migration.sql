-- CreateTable
CREATE TABLE "ExpectedDelivery" (
    "id" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "deliveryMonth" INTEGER NOT NULL,
    "deliveryYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "opportunityId" TEXT NOT NULL,

    CONSTRAINT "ExpectedDelivery_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExpectedDelivery" ADD CONSTRAINT "ExpectedDelivery_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
