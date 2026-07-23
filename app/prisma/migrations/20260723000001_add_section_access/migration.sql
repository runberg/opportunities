-- CreateEnum
CREATE TYPE "SectionAccess" AS ENUM ('FULL', 'READ_ONLY', 'NONE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "opportunitiesAccess" "SectionAccess" NOT NULL DEFAULT 'FULL',
                   ADD COLUMN "adhocAccess" "SectionAccess" NOT NULL DEFAULT 'FULL';
