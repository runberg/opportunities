-- CreateEnum
CREATE TYPE "AdhocAgreementStatus" AS ENUM ('DRAFT', 'SIGNED', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "AdhocDeliverableStatus" AS ENUM ('NOT_APPROVED', 'PARTIALLY_APPROVED', 'APPROVED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "AdhocDocumentType" AS ENUM ('BUDGET', 'APPROVAL');

-- AlterEnum
ALTER TYPE "SystemLogType" ADD VALUE 'ADHOC_AGREEMENT_CREATED';
ALTER TYPE "SystemLogType" ADD VALUE 'ADHOC_AGREEMENT_UPDATED';
ALTER TYPE "SystemLogType" ADD VALUE 'ADHOC_DELIVERABLE_CREATED';
ALTER TYPE "SystemLogType" ADD VALUE 'ADHOC_DELIVERABLE_UPDATED';
ALTER TYPE "SystemLogType" ADD VALUE 'ADHOC_LINE_ITEM_ADDED';
ALTER TYPE "SystemLogType" ADD VALUE 'ADHOC_LINE_ITEM_UPDATED';
ALTER TYPE "SystemLogType" ADD VALUE 'ADHOC_LINE_ITEM_DELETED';
ALTER TYPE "SystemLogType" ADD VALUE 'ADHOC_DOCUMENT_UPLOADED';
ALTER TYPE "SystemLogType" ADD VALUE 'ADHOC_DOCUMENT_DELETED';

-- CreateTable
CREATE TABLE "AdhocAgreement" (
    "id"          TEXT        NOT NULL,
    "title"       TEXT        NOT NULL,
    "version"     INTEGER     NOT NULL,
    "status"      "AdhocAgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "createdById" TEXT        NOT NULL,
    CONSTRAINT "AdhocAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdhocDeliverable" (
    "id"             TEXT        NOT NULL,
    "title"          TEXT        NOT NULL,
    "description"    TEXT,
    "approvedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status"         "AdhocDeliverableStatus" NOT NULL DEFAULT 'NOT_APPROVED',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    "agreementId"    TEXT        NOT NULL,
    "createdById"    TEXT        NOT NULL,
    CONSTRAINT "AdhocDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdhocLineItem" (
    "id"            TEXT        NOT NULL,
    "description"   TEXT        NOT NULL,
    "amount"        DECIMAL(10,2) NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    "deliverableId" TEXT        NOT NULL,
    CONSTRAINT "AdhocLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdhocDocument" (
    "id"            TEXT        NOT NULL,
    "displayName"   TEXT        NOT NULL,
    "filename"      TEXT        NOT NULL,
    "originalName"  TEXT        NOT NULL,
    "mimeType"      TEXT        NOT NULL,
    "size"          INTEGER     NOT NULL,
    "type"          "AdhocDocumentType" NOT NULL,
    "notes"         TEXT,
    "uploadedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById"  TEXT        NOT NULL,
    "deliverableId" TEXT        NOT NULL,
    CONSTRAINT "AdhocDocument_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "SystemLog" ADD COLUMN "adhocDeliverableId" TEXT;

-- AddForeignKey
ALTER TABLE "AdhocAgreement" ADD CONSTRAINT "AdhocAgreement_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdhocDeliverable" ADD CONSTRAINT "AdhocDeliverable_agreementId_fkey"
    FOREIGN KEY ("agreementId") REFERENCES "AdhocAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdhocDeliverable" ADD CONSTRAINT "AdhocDeliverable_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdhocLineItem" ADD CONSTRAINT "AdhocLineItem_deliverableId_fkey"
    FOREIGN KEY ("deliverableId") REFERENCES "AdhocDeliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdhocDocument" ADD CONSTRAINT "AdhocDocument_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdhocDocument" ADD CONSTRAINT "AdhocDocument_deliverableId_fkey"
    FOREIGN KEY ("deliverableId") REFERENCES "AdhocDeliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_adhocDeliverableId_fkey"
    FOREIGN KEY ("adhocDeliverableId") REFERENCES "AdhocDeliverable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
