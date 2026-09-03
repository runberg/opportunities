-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SystemLogType" ADD VALUE 'INVENTORY_PACKAGE_CREATED';
ALTER TYPE "SystemLogType" ADD VALUE 'INVENTORY_PACKAGE_UPDATED';
ALTER TYPE "SystemLogType" ADD VALUE 'INVENTORY_PACKAGE_DELETED';
ALTER TYPE "SystemLogType" ADD VALUE 'INVENTORY_ITEM_CREATED';
ALTER TYPE "SystemLogType" ADD VALUE 'INVENTORY_ITEM_UPDATED';
ALTER TYPE "SystemLogType" ADD VALUE 'INVENTORY_ITEM_DELETED';
ALTER TYPE "SystemLogType" ADD VALUE 'INVENTORY_ITEM_UTILIZED';
ALTER TYPE "SystemLogType" ADD VALUE 'INVENTORY_UTILIZATION_UPDATED';
ALTER TYPE "SystemLogType" ADD VALUE 'INVENTORY_UTILIZATION_DELETED';

-- AlterTable
ALTER TABLE "SystemLog" ADD COLUMN     "inventoryPackageId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "inventoryAccess" "SectionAccess" NOT NULL DEFAULT 'FULL';

-- CreateTable
CREATE TABLE "InventoryPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "opportunityId" TEXT,

    CONSTRAINT "InventoryPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "originalQuantity" INTEGER NOT NULL,
    "remainingQuantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "packageId" TEXT NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryUtilization" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "comment" TEXT,
    "filename" TEXT,
    "originalName" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "InventoryUtilization_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_inventoryPackageId_fkey" FOREIGN KEY ("inventoryPackageId") REFERENCES "InventoryPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPackage" ADD CONSTRAINT "InventoryPackage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPackage" ADD CONSTRAINT "InventoryPackage_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "InventoryPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryUtilization" ADD CONSTRAINT "InventoryUtilization_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryUtilization" ADD CONSTRAINT "InventoryUtilization_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

