/*
  Warnings:

  - The `releaseDate` column on the `movies` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "movies" DROP COLUMN "releaseDate",
ADD COLUMN     "releaseDate" TIMESTAMP(3);
