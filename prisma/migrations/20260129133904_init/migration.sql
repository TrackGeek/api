/*
  Warnings:

  - You are about to drop the column `parentGames` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `storylines` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `versionParents` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `versionTitles` on the `Game` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Game" DROP COLUMN "parentGames",
DROP COLUMN "storylines",
DROP COLUMN "versionParents",
DROP COLUMN "versionTitles",
ADD COLUMN     "parentGame" JSONB,
ADD COLUMN     "storyline" JSONB,
ADD COLUMN     "versionParent" JSONB,
ADD COLUMN     "versionTitle" JSONB;
