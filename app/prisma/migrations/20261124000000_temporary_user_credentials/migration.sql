ALTER TABLE "User"
  ADD COLUMN "credentialVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "temporaryPasswordExpiresAt" TIMESTAMP(3),
  ADD COLUMN "lastLoginAt" TIMESTAMP(3),
  ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

ALTER TABLE "SmtpConfig"
  ADD COLUMN "resetEmailSubject" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "resetEmailBody" TEXT NOT NULL DEFAULT '';

ALTER TABLE "EmailOutbox" ADD COLUMN "credentialVersion" INTEGER;

UPDATE "User" AS u SET "lastLoginAt" = history.latest
FROM (SELECT "userId", MAX("createdAt") AS latest FROM "SystemLog" WHERE "type" = 'LOGIN' GROUP BY "userId") AS history
WHERE u.id = history."userId";

-- The previous invitation flow was the only producer of admin outbox messages.
DELETE FROM "EmailOutbox" WHERE "module" = 'admin';
