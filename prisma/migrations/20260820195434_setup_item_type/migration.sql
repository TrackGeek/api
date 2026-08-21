-- CreateEnum
CREATE TYPE "SetupItemType" AS ENUM ('COMPONENT', 'TITLE', 'DIVIDER');

-- AlterTable
ALTER TABLE "SetupItem" ADD COLUMN     "type" "SetupItemType" NOT NULL DEFAULT 'COMPONENT',
ALTER COLUMN "name" DROP NOT NULL;
