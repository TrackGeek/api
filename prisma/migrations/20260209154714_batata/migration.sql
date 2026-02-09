/*
  Warnings:

  - You are about to drop the column `video` on the `movies` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "movies" DROP COLUMN "video",
ADD COLUMN     "videos" JSONB;
