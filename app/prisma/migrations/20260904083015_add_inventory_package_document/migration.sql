-- AlterTable
ALTER TABLE "InventoryPackage" ADD COLUMN     "filename" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "originalName" TEXT,
ADD COLUMN     "size" INTEGER;

