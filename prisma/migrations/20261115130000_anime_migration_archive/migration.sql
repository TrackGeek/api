CREATE TABLE "AnimeMigrationArchive" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnimeMigrationArchive_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AnimeMigrationArchive_sourceType_sourceId_key" ON "AnimeMigrationArchive"("sourceType", "sourceId");
ALTER TABLE "AnimeMigrationArchive" ADD CONSTRAINT "AnimeMigrationArchive_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
