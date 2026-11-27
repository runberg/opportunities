CREATE TABLE "DeliveryUnitType" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "nameKey" TEXT NOT NULL UNIQUE
);

INSERT INTO "DeliveryUnitType" ("id", "name", "nameKey")
SELECT 'legacy-' || md5(key), MIN(name), key
FROM (
  SELECT COALESCE(NULLIF(BTRIM("unitType"), ''), 'Unspecified') AS name,
         LOWER(COALESCE(NULLIF(BTRIM("unitType"), ''), 'Unspecified')) AS key
  FROM "ExpectedDelivery"
) AS names
GROUP BY key;

ALTER TABLE "ExpectedDelivery" ADD COLUMN "unitTypeId" TEXT;
UPDATE "ExpectedDelivery" AS delivery
SET "unitTypeId" = types."id"
FROM "DeliveryUnitType" AS types
WHERE types."nameKey" = LOWER(COALESCE(NULLIF(BTRIM(delivery."unitType"), ''), 'Unspecified'));
ALTER TABLE "ExpectedDelivery" ALTER COLUMN "unitTypeId" SET NOT NULL;
CREATE INDEX "ExpectedDelivery_unitTypeId_idx" ON "ExpectedDelivery"("unitTypeId");
ALTER TABLE "ExpectedDelivery" ADD CONSTRAINT "ExpectedDelivery_unitTypeId_fkey" FOREIGN KEY ("unitTypeId") REFERENCES "DeliveryUnitType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
