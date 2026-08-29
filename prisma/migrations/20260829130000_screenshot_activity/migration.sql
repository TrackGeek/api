-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'ScreenshotAdded';

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "gameScreenshotId" TEXT;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_gameScreenshotId_fkey" FOREIGN KEY ("gameScreenshotId") REFERENCES "GameScreenshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
