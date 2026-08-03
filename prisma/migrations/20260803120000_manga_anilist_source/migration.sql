-- Manga is now sourced from AniList instead of MyAnimeList (Tenrai).
-- `anilistId` becomes the canonical id; existing rows keep their `malId` and get
-- adopted (anilistId filled in) the next time they are fetched or refreshed.

ALTER TABLE "Manga" ADD COLUMN "anilistId" INTEGER;
ALTER TABLE "Manga" ADD COLUMN "bannerUrl" TEXT;
ALTER TABLE "Manga" ADD COLUMN "anilistScore" DOUBLE PRECISION;
ALTER TABLE "Manga" ADD COLUMN "source" TEXT;
ALTER TABLE "Manga" ADD COLUMN "countryOfOrigin" TEXT;
ALTER TABLE "Manga" ADD COLUMN "favoritesCount" INTEGER;
ALTER TABLE "Manga" ADD COLUMN "tags" JSONB;

ALTER TABLE "Manga" ALTER COLUMN "malId" DROP NOT NULL;

ALTER TABLE "Manga" DROP COLUMN "malReviewScore";
ALTER TABLE "Manga" DROP COLUMN "publishing";
ALTER TABLE "Manga" DROP COLUMN "rank";
ALTER TABLE "Manga" DROP COLUMN "explicitGenres";

-- Relations were stored in the MAL shape; AniList stores a react-flow graph.
UPDATE "Manga" SET "relations" = NULL;

-- Stale MAL payloads are re-fetched from AniList on next access.
UPDATE "Manga" SET "lastRefreshedAt" = TIMESTAMP '1970-01-01 00:00:00';

CREATE UNIQUE INDEX "Manga_anilistId_key" ON "Manga"("anilistId");
