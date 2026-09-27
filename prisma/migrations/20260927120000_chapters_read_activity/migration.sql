ALTER TYPE "ActivityType" ADD VALUE 'ChaptersRead';

CREATE INDEX "Activity_userId_type_mangaProgressId_idx" ON "Activity"("userId", "type", "mangaProgressId");
