-- Add emailNotifications preference to User (disabled by default)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailNotifications" BOOLEAN NOT NULL DEFAULT false;
-- Reset any users that got default true from an earlier migration
UPDATE "User" SET "emailNotifications" = false WHERE "emailNotifications" = true;

-- CreateTable for SMTP configuration (singleton)
CREATE TABLE IF NOT EXISTS "SmtpConfig" (
    "id"                  TEXT NOT NULL DEFAULT 'default',
    "host"                TEXT NOT NULL,
    "port"                INTEGER NOT NULL DEFAULT 587,
    "secure"              BOOLEAN NOT NULL DEFAULT false,
    "username"            TEXT NOT NULL,
    "password"            TEXT NOT NULL,
    "fromAddress"         TEXT NOT NULL,
    "fromName"            TEXT NOT NULL DEFAULT 'Opportunities',
    "enabled"             BOOLEAN NOT NULL DEFAULT false,
    "notificationSubject" TEXT NOT NULL DEFAULT '',
    "notificationBody"    TEXT NOT NULL DEFAULT '',
    "updatedAt"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmtpConfig_pkey" PRIMARY KEY ("id")
);
