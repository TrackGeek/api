-- AlterTable
ALTER TABLE "GameProgress" ADD COLUMN "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[];
