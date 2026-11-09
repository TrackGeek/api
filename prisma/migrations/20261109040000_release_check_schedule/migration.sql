ALTER TABLE "Anime" ADD COLUMN "lastReleaseCheckedAt" TIMESTAMP(3),
ADD COLUMN "nextReleaseCheckAt" TIMESTAMP(3);
ALTER TABLE "TVShow" ADD COLUMN "lastReleaseCheckedAt" TIMESTAMP(3),
ADD COLUMN "nextReleaseCheckAt" TIMESTAMP(3);

CREATE INDEX "Anime_nextReleaseCheckAt_idx" ON "Anime"("nextReleaseCheckAt");
CREATE INDEX "TVShow_nextReleaseCheckAt_idx" ON "TVShow"("nextReleaseCheckAt");
