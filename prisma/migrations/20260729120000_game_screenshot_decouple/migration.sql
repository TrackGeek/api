-- Decouple game screenshots from reviews: they now belong to a user + game directly.

-- Rename table and its primary key
ALTER TABLE "GameReviewScreenshot" RENAME TO "GameScreenshot";
ALTER TABLE "GameScreenshot" RENAME CONSTRAINT "GameReviewScreenshot_pkey" TO "GameScreenshot_pkey";

-- Drop the review relation
ALTER TABLE "GameScreenshot" DROP CONSTRAINT "GameReviewScreenshot_gameReviewId_fkey";
DROP INDEX "GameReviewScreenshot_gameReviewId_idx";

-- New ownership columns, backfilled from the review they used to belong to
ALTER TABLE "GameScreenshot" ADD COLUMN "userId" TEXT, ADD COLUMN "gameId" TEXT;
ALTER TABLE "GameScreenshot" ALTER COLUMN "isSpoiler" SET DEFAULT false;

UPDATE "GameScreenshot" s
SET "userId" = r."userId", "gameId" = r."gameId"
FROM "GameReview" r
WHERE s."gameReviewId" = r."id";

DELETE FROM "GameScreenshot" WHERE "userId" IS NULL OR "gameId" IS NULL;

ALTER TABLE "GameScreenshot"
  ALTER COLUMN "userId" SET NOT NULL,
  ALTER COLUMN "gameId" SET NOT NULL,
  DROP COLUMN "gameReviewId";

CREATE INDEX "GameScreenshot_userId_gameId_idx" ON "GameScreenshot"("userId", "gameId");

ALTER TABLE "GameScreenshot" ADD CONSTRAINT "GameScreenshot_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameScreenshot" ADD CONSTRAINT "GameScreenshot_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
