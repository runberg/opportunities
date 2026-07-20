-- Create NotificationLevel enum
CREATE TYPE "NotificationLevel" AS ENUM ('NONE', 'STATUS_CHANGES', 'ALL');

-- Add new notification columns to User
ALTER TABLE "User"
  ADD COLUMN "opportunityNotifications" "NotificationLevel" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "adhocNotifications"        "NotificationLevel" NOT NULL DEFAULT 'NONE';

-- Migrate: users who had emailNotifications=true become STATUS_CHANGES for opportunities
UPDATE "User"
  SET "opportunityNotifications" = 'STATUS_CHANGES'
  WHERE "emailNotifications" = true;

-- Drop legacy column
ALTER TABLE "User" DROP COLUMN "emailNotifications";

-- Rename SmtpConfig notification columns
ALTER TABLE "SmtpConfig"
  RENAME COLUMN "notificationSubject" TO "opportunityNotificationSubject";

ALTER TABLE "SmtpConfig"
  RENAME COLUMN "notificationBody" TO "opportunityNotificationBody";

-- Add new SmtpConfig columns
ALTER TABLE "SmtpConfig"
  ADD COLUMN "adhocNotificationSubject" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "adhocNotificationBody"    TEXT NOT NULL DEFAULT '',
  ADD COLUMN "notificationDelayMinutes" INTEGER NOT NULL DEFAULT 15;
