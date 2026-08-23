-- CreateTable
CREATE TABLE "WatchLink" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "contentTypes" "ContentType"[] DEFAULT ARRAY['Anime', 'TVShow', 'Movie']::"ContentType"[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WatchLink_profileId_idx" ON "WatchLink"("profileId");

-- AddForeignKey
ALTER TABLE "WatchLink" ADD CONSTRAINT "WatchLink_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
