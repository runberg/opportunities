CREATE TABLE "DeliveryShipment" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "deliveredOn" DATE NOT NULL,
    "comment" TEXT,
    "filename" TEXT,
    "originalName" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeliveryShipment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DeliveryShipment_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "ExpectedDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DeliveryShipment_deliveryId_idx" ON "DeliveryShipment"("deliveryId");
