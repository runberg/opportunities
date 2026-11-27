ALTER TABLE "InventoryPackage" ADD COLUMN "adhocDeliverableId" TEXT;
ALTER TABLE "InventoryPackage" ADD CONSTRAINT "InventoryPackage_adhocDeliverableId_fkey" FOREIGN KEY ("adhocDeliverableId") REFERENCES "AdhocDeliverable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryItem" ADD COLUMN "adhocDeliverableId" TEXT;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_adhocDeliverableId_fkey" FOREIGN KEY ("adhocDeliverableId") REFERENCES "AdhocDeliverable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryUtilization" ADD COLUMN "adhocDeliverableId" TEXT;
ALTER TABLE "InventoryUtilization" ADD CONSTRAINT "InventoryUtilization_adhocDeliverableId_fkey" FOREIGN KEY ("adhocDeliverableId") REFERENCES "AdhocDeliverable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
