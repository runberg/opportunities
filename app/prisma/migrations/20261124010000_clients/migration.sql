ALTER TYPE "SystemLogType" ADD VALUE 'CLIENT_CREATED';
ALTER TYPE "SystemLogType" ADD VALUE 'CLIENT_UPDATED';
ALTER TYPE "SystemLogType" ADD VALUE 'CLIENT_DELETED';

ALTER TABLE "User" ADD COLUMN "clientsAccess" "SectionAccess" NOT NULL DEFAULT 'NONE';

CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "codeName" TEXT NOT NULL,
    "codeNameKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Client_codeNameKey_key" ON "Client"("codeNameKey");

CREATE TABLE "ClientCommunication" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "communicatedAt" TIMESTAMP(3) NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientCommunication_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ClientCommunication_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClientCommunication_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ClientCommunication_clientId_communicatedAt_idx" ON "ClientCommunication"("clientId", "communicatedAt");

ALTER TABLE "Opportunity" ADD COLUMN "clientId" TEXT;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdhocDeliverable" ADD COLUMN "clientId" TEXT;
ALTER TABLE "AdhocDeliverable" ADD CONSTRAINT "AdhocDeliverable_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Opportunity_clientId_idx" ON "Opportunity"("clientId");
CREATE INDEX "AdhocDeliverable_clientId_idx" ON "AdhocDeliverable"("clientId");
