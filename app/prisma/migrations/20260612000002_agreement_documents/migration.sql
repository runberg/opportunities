-- Add signedDate to AdhocAgreement
ALTER TABLE "AdhocAgreement" ADD COLUMN "signedDate" TIMESTAMP(3);

-- New SystemLogType values
ALTER TYPE "SystemLogType" ADD VALUE IF NOT EXISTS 'ADHOC_AGREEMENT_SIGNED';
ALTER TYPE "SystemLogType" ADD VALUE IF NOT EXISTS 'ADHOC_AGREEMENT_DOCUMENT_UPLOADED';
ALTER TYPE "SystemLogType" ADD VALUE IF NOT EXISTS 'ADHOC_AGREEMENT_DOCUMENT_DELETED';

-- New enum for agreement document types
CREATE TYPE "AdhocAgreementDocumentType" AS ENUM ('DRAFT', 'COUNTERSIGNED');

-- Agreement-level documents table
CREATE TABLE "AdhocAgreementDocument" (
  "id"           TEXT NOT NULL,
  "displayName"  TEXT NOT NULL,
  "filename"     TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType"     TEXT NOT NULL,
  "size"         INTEGER NOT NULL,
  "type"         "AdhocAgreementDocumentType" NOT NULL,
  "notes"        TEXT,
  "uploadedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedById" TEXT NOT NULL,
  "agreementId"  TEXT NOT NULL,

  CONSTRAINT "AdhocAgreementDocument_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AdhocAgreementDocument"
  ADD CONSTRAINT "AdhocAgreementDocument_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AdhocAgreementDocument"
  ADD CONSTRAINT "AdhocAgreementDocument_agreementId_fkey"
    FOREIGN KEY ("agreementId") REFERENCES "AdhocAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
