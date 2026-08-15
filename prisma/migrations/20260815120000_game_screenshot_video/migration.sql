-- Game screenshots can now also hold YouTube/Twitch video links.

-- CreateEnum
CREATE TYPE "GameMediaType" AS ENUM ('Image', 'Video');

-- CreateEnum
CREATE TYPE "GameVideoProvider" AS ENUM ('YouTube', 'Twitch');

-- AlterTable
ALTER TABLE "GameScreenshot"
  ADD COLUMN "type" "GameMediaType" NOT NULL DEFAULT 'Image',
  ADD COLUMN "provider" "GameVideoProvider";
