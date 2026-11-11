-- Blank templates retain the application's default welcome email.
ALTER TABLE "SmtpConfig"
ADD COLUMN "welcomeEmailSubject" TEXT NOT NULL DEFAULT '',
ADD COLUMN "welcomeEmailBody" TEXT NOT NULL DEFAULT '';
