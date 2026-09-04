-- CreateEnum
CREATE TYPE "InventoryAllocationStatus" AS ENUM ('RESERVED', 'ALLOCATED');

-- AlterTable
ALTER TABLE "InventoryUtilization" ADD COLUMN     "allocationStatus" "InventoryAllocationStatus" NOT NULL DEFAULT 'RESERVED';

