-- Stored episode pages came from the MAL video listing, which only returns the most recent episodes.
-- Drop them so they get refetched from the full episode listing.

UPDATE "Anime" SET "episodes" = NULL WHERE "episodes" IS NOT NULL;
