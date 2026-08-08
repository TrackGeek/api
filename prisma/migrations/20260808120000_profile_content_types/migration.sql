-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('Anime', 'Manga', 'TVShow', 'Movie', 'Game', 'Book');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "contentTypes" "ContentType"[] DEFAULT ARRAY['Anime', 'Manga', 'TVShow', 'Movie', 'Game', 'Book']::"ContentType"[];
