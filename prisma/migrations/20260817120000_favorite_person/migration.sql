-- AlterEnum
ALTER TYPE "FavoriteType" ADD VALUE 'Person';

-- AlterTable
ALTER TABLE "Favorite" ADD COLUMN     "personId" TEXT;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "anilistId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Person_anilistId_key" ON "Person"("anilistId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_personId_key" ON "Favorite"("userId", "personId");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
