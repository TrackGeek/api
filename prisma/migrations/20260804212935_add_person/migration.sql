-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tmdbId" INTEGER,
    "malId" INTEGER,
    "imageUrl" TEXT,
    "biography" TEXT,
    "birthday" TIMESTAMP(3),
    "deathday" TIMESTAMP(3),
    "placeOfBirth" TEXT,
    "knownForDepartment" TEXT,
    "alsoKnownAs" TEXT[],
    "gender" INTEGER,
    "homepage" TEXT,
    "popularity" DOUBLE PRECISION,
    "external" JSONB,
    "images" TEXT[],
    "lastRefreshedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_slug_key" ON "Person"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Person_tmdbId_key" ON "Person"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Person_malId_key" ON "Person"("malId");

-- CreateIndex
CREATE INDEX "Person_name_idx" ON "Person"("name");
