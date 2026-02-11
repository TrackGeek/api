/*
  Warnings:

  - The `firstAirDate` column on the `TVShow` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `lastAirDate` column on the `TVShow` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "TVShow" DROP COLUMN "firstAirDate",
ADD COLUMN     "firstAirDate" TIMESTAMP(3),
DROP COLUMN "lastAirDate",
ADD COLUMN     "lastAirDate" TIMESTAMP(3);
