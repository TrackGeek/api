-- CreateEnum
CREATE TYPE "CosmeticType" AS ENUM ('ProfileColor', 'AvatarFrame', 'ProfileTitle', 'BannerEffect');

-- AlterEnum
ALTER TYPE "CoinReason" ADD VALUE 'Purchase';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "avatarFrame" TEXT,
ADD COLUMN     "bannerEffect" TEXT,
ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "UserCosmetic" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CosmeticType" NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCosmetic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCosmetic_userId_type_key_key" ON "UserCosmetic"("userId", "type", "key");

-- AddForeignKey
ALTER TABLE "UserCosmetic" ADD CONSTRAINT "UserCosmetic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
