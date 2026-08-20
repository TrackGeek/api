-- CreateTable
CREATE TABLE "SetupPhoto" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetupPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetupItem" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "link" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetupItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SetupPhoto_profileId_idx" ON "SetupPhoto"("profileId");

-- CreateIndex
CREATE INDEX "SetupItem_profileId_idx" ON "SetupItem"("profileId");

-- AddForeignKey
ALTER TABLE "SetupPhoto" ADD CONSTRAINT "SetupPhoto_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetupItem" ADD CONSTRAINT "SetupItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
