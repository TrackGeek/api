-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReactionType" ADD VALUE 'GameReview';
ALTER TYPE "ReactionType" ADD VALUE 'AnimeReview';
ALTER TYPE "ReactionType" ADD VALUE 'MangaReview';
ALTER TYPE "ReactionType" ADD VALUE 'TvShowReview';
ALTER TYPE "ReactionType" ADD VALUE 'MovieReview';
ALTER TYPE "ReactionType" ADD VALUE 'BookReview';

-- AlterTable
ALTER TABLE "Reaction" ADD COLUMN     "animeReviewId" TEXT,
ADD COLUMN     "bookReviewId" TEXT,
ADD COLUMN     "gameReviewId" TEXT,
ADD COLUMN     "mangaReviewId" TEXT,
ADD COLUMN     "movieReviewId" TEXT,
ADD COLUMN     "tvShowReviewId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_gameReviewId_key" ON "Reaction"("userId", "gameReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_animeReviewId_key" ON "Reaction"("userId", "animeReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_mangaReviewId_key" ON "Reaction"("userId", "mangaReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_tvShowReviewId_key" ON "Reaction"("userId", "tvShowReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_movieReviewId_key" ON "Reaction"("userId", "movieReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_bookReviewId_key" ON "Reaction"("userId", "bookReviewId");

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_gameReviewId_fkey" FOREIGN KEY ("gameReviewId") REFERENCES "GameReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_animeReviewId_fkey" FOREIGN KEY ("animeReviewId") REFERENCES "AnimeReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_mangaReviewId_fkey" FOREIGN KEY ("mangaReviewId") REFERENCES "MangaReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_tvShowReviewId_fkey" FOREIGN KEY ("tvShowReviewId") REFERENCES "TVShowReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_movieReviewId_fkey" FOREIGN KEY ("movieReviewId") REFERENCES "MovieReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_bookReviewId_fkey" FOREIGN KEY ("bookReviewId") REFERENCES "BookReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

