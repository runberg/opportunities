-- Make username and password optional to support unauthenticated SMTP relays
ALTER TABLE "SmtpConfig" ALTER COLUMN "username" DROP NOT NULL;
ALTER TABLE "SmtpConfig" ALTER COLUMN "password" DROP NOT NULL;
