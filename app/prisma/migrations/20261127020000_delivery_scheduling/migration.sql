CREATE TYPE "DeliveryType" AS ENUM ('FAT', 'SAT', 'DELIVERY');

ALTER TABLE "ExpectedDelivery"
  ALTER COLUMN "deliveryMonth" DROP NOT NULL,
  ALTER COLUMN "deliveryYear" DROP NOT NULL,
  ADD COLUMN "deliveryType" "DeliveryType" NOT NULL DEFAULT 'DELIVERY',
  ADD COLUMN "offsetMonths" INTEGER,
  ADD COLUMN "overrideDate" DATE;
