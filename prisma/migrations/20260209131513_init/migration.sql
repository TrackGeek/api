-- CreateEnum
CREATE TYPE "AnimeType" AS ENUM ('TV', 'ONA', 'Movie', 'Special', 'OVA', 'Music');

-- CreateEnum
CREATE TYPE "AnimeStatus" AS ENUM ('Finished Airing', 'Currently Airing', 'Not yet aired');

-- CreateEnum
CREATE TYPE "AnimeRating" AS ENUM ('G - All Ages', 'PG - Children', 'PG-13 - Teens 13 or older', 'R - 17+ (violence & profanity)', 'R+ - Mild Nudity', 'Rx - Hentai');

-- CreateEnum
CREATE TYPE "AnimeSeason" AS ENUM ('summer', 'winter', 'spring', 'fall');

-- CreateEnum
CREATE TYPE "MangaType" AS ENUM ('Manga', 'Novel', 'Light Novel', 'One-shot', 'Doujinshi', 'Manhua', 'Manhwa', 'OEL');

-- CreateEnum
CREATE TYPE "MangaStatus" AS ENUM ('Finished', 'Publishing', 'On Hiatus', 'Discontinued', 'Not yet published');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "color" TEXT DEFAULT '#10b981',
    "language" TEXT DEFAULT 'en-US',
    "timezone" TEXT,
    "about" TEXT DEFAULT 'Hello! I''m using TrackGeek.',
    "bannerUrl" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "followings" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "followings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reactions" (
    "id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments_reactions" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "reactionId" TEXT NOT NULL,

    CONSTRAINT "comments_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games_comments" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "games_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books_comments" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "books_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animes_comments" (
    "id" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "animes_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mangas_comments" (
    "id" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "mangas_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tvshows_comments" (
    "id" TEXT NOT NULL,
    "tvShowId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "tvshows_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movies_comments" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "movies_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles_comments" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "profiles_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "igdbId" INTEGER NOT NULL,
    "ageRatings" JSONB,
    "aggregatedRating" DOUBLE PRECISION,
    "aggregatedRatingCount" INTEGER,
    "alternativeNames" JSONB,
    "artworks" JSONB,
    "checksum" TEXT,
    "bundles" JSONB,
    "collections" JSONB,
    "coverUrl" TEXT,
    "dlcs" JSONB,
    "expandedGames" JSONB,
    "expansions" JSONB,
    "externalGames" JSONB,
    "firstReleaseDate" TIMESTAMP(3),
    "forks" JSONB,
    "franchise" JSONB,
    "franchises" JSONB,
    "gameEngines" JSONB,
    "gameLocalizations" JSONB,
    "gameModes" JSONB,
    "gameStatus" JSONB,
    "gameType" JSONB,
    "genres" JSONB,
    "hypes" INTEGER,
    "involvedCompanies" JSONB,
    "keywords" JSONB,
    "multiplayerModes" JSONB,
    "name" TEXT,
    "parentGame" JSONB,
    "platforms" JSONB,
    "playerPerspectives" JSONB,
    "ports" JSONB,
    "rating" DOUBLE PRECISION,
    "ratingCount" INTEGER,
    "releaseDates" JSONB,
    "remakes" JSONB,
    "remasters" JSONB,
    "screenshots" JSONB,
    "similarGames" JSONB,
    "slug" TEXT NOT NULL,
    "standaloneExpansions" JSONB,
    "storyline" JSONB,
    "summary" TEXT,
    "totalRating" DOUBLE PRECISION,
    "totalRatingCount" INTEGER,
    "versionParent" JSONB,
    "versionTitle" JSONB,
    "videos" JSONB,
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "alternativeTitles" JSONB,
    "audioSeconds" INTEGER,
    "bookCategoryId" INTEGER,
    "bookStatus" JSONB,
    "bookStatusId" INTEGER,
    "canonical" JSONB,
    "canonicalId" INTEGER,
    "compilation" BOOLEAN,
    "curationStatus" INTEGER,
    "defaultAudioEdition" JSONB,
    "defaultAudioEditionId" INTEGER,
    "defaultCoverEedition" JSONB,
    "defaultCoverEditionId" INTEGER,
    "defaultEbookEdition" JSONB,
    "defaultEbookEditionId" INTEGER,
    "defaultPhysicalEdition" JSONB,
    "defaultPhysicalEditionId" INTEGER,
    "description" TEXT,
    "editionsCount" INTEGER,
    "featuredBookSeries" JSONB,
    "featuredBookSeriesId" INTEGER,
    "headerImageId" INTEGER,
    "headline" TEXT,
    "hardcoverId" INTEGER NOT NULL,
    "image" JSONB,
    "imageId" INTEGER,
    "links" JSONB,
    "literaryTypeId" INTEGER,
    "pages" INTEGER,
    "releaseDate" TIMESTAMP(3),
    "releaseYear" INTEGER,
    "slug" TEXT NOT NULL,
    "state" TEXT,
    "title" TEXT NOT NULL,
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animes" (
    "id" TEXT NOT NULL,
    "malId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "images" JSONB,
    "trailer" JSONB,
    "titles" JSONB,
    "type" "AnimeType",
    "source" TEXT,
    "episodes" INTEGER,
    "status" "AnimeStatus",
    "aired" JSONB,
    "duration" TEXT,
    "rating" "AnimeRating",
    "rank" INTEGER,
    "popularity" INTEGER,
    "synopsis" TEXT,
    "background" TEXT,
    "season" "AnimeSeason",
    "year" INTEGER,
    "broadcast" JSONB,
    "producers" JSONB,
    "licensors" JSONB,
    "studios" JSONB,
    "genres" JSONB,
    "explicitGenres" JSONB,
    "themes" JSONB,
    "demographics" JSONB,
    "relations" JSONB,
    "theme" JSONB,
    "external" JSONB,
    "characters" JSONB,
    "cast" JSONB,
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mangas" (
    "id" TEXT NOT NULL,
    "malId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "images" JSONB,
    "titles" JSONB,
    "type" "MangaType",
    "chapters" INTEGER,
    "volumes" INTEGER,
    "status" "MangaStatus",
    "publishing" BOOLEAN,
    "published" JSONB,
    "rank" INTEGER,
    "popularity" INTEGER,
    "synopsis" TEXT,
    "authors" JSONB,
    "serializations" JSONB,
    "genres" JSONB,
    "explicitGenres" JSONB,
    "themes" JSONB,
    "demographics" JSONB,
    "relations" JSONB,
    "external" JSONB,
    "characters" JSONB,
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mangas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tvshows" (
    "id" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "createdBy" JSONB,
    "episodeRuntime" INTEGER[],
    "firstAirDate" TEXT,
    "genres" JSONB,
    "homepage" TEXT,
    "inProduction" BOOLEAN,
    "languages" TEXT[],
    "LastAirDate" TEXT,
    "lastEpisodeToAir" JSONB,
    "name" TEXT,
    "nextEpisodeToAir" TEXT,
    "networks" JSONB,
    "episodes" INTEGER,
    "seasonsNumber" INTEGER,
    "originCountry" TEXT[],
    "originalLanguage" TEXT,
    "originalName" TEXT,
    "popularity" INTEGER,
    "posterPath" TEXT,
    "productionCompanies" JSONB,
    "productionCountries" JSONB,
    "seasons" JSONB,
    "status" TEXT,
    "tagline" TEXT,
    "type" TEXT,
    "cast" JSONB,
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tvshows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movies" (
    "id" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "imdbId" TEXT,
    "belongsToCollection" TEXT,
    "budget" INTEGER,
    "genres" JSONB,
    "homepage" TEXT,
    "originalLanguage" TEXT,
    "originalTitle" TEXT,
    "overview" TEXT,
    "popularity" INTEGER,
    "posterPath" TEXT,
    "productionCompanies" JSONB,
    "productionCountries" JSONB,
    "releaseDate" TEXT,
    "revenue" INTEGER,
    "runtime" INTEGER,
    "spokenLanguages" JSONB,
    "status" TEXT,
    "title" TEXT,
    "video" BOOLEAN,
    "cast" JSONB,
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE INDEX "followings_followerId_idx" ON "followings"("followerId");

-- CreateIndex
CREATE INDEX "followings_followingId_idx" ON "followings"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "followings_followerId_followingId_key" ON "followings"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "comments_reactions_commentId_reactionId_key" ON "comments_reactions"("commentId", "reactionId");

-- CreateIndex
CREATE UNIQUE INDEX "games_comments_gameId_commentId_key" ON "games_comments"("gameId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "books_comments_bookId_commentId_key" ON "books_comments"("bookId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "animes_comments_animeId_commentId_key" ON "animes_comments"("animeId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "mangas_comments_mangaId_commentId_key" ON "mangas_comments"("mangaId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "tvshows_comments_tvShowId_commentId_key" ON "tvshows_comments"("tvShowId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "movies_comments_movieId_commentId_key" ON "movies_comments"("movieId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_comments_profileId_commentId_key" ON "profiles_comments"("profileId", "commentId");

-- CreateIndex
CREATE INDEX "feed_events_userId_createdAt_idx" ON "feed_events"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "games_igdbId_key" ON "games"("igdbId");

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "books_hardcoverId_key" ON "books"("hardcoverId");

-- CreateIndex
CREATE UNIQUE INDEX "animes_malId_key" ON "animes"("malId");

-- CreateIndex
CREATE UNIQUE INDEX "tvshows_tmdbId_key" ON "tvshows"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "movies_tmdbId_key" ON "movies"("tmdbId");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followings" ADD CONSTRAINT "followings_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followings" ADD CONSTRAINT "followings_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments_reactions" ADD CONSTRAINT "comments_reactions_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments_reactions" ADD CONSTRAINT "comments_reactions_reactionId_fkey" FOREIGN KEY ("reactionId") REFERENCES "reactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games_comments" ADD CONSTRAINT "games_comments_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games_comments" ADD CONSTRAINT "games_comments_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books_comments" ADD CONSTRAINT "books_comments_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books_comments" ADD CONSTRAINT "books_comments_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animes_comments" ADD CONSTRAINT "animes_comments_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "animes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animes_comments" ADD CONSTRAINT "animes_comments_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mangas_comments" ADD CONSTRAINT "mangas_comments_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "mangas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mangas_comments" ADD CONSTRAINT "mangas_comments_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tvshows_comments" ADD CONSTRAINT "tvshows_comments_tvShowId_fkey" FOREIGN KEY ("tvShowId") REFERENCES "tvshows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tvshows_comments" ADD CONSTRAINT "tvshows_comments_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movies_comments" ADD CONSTRAINT "movies_comments_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movies_comments" ADD CONSTRAINT "movies_comments_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles_comments" ADD CONSTRAINT "profiles_comments_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles_comments" ADD CONSTRAINT "profiles_comments_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_events" ADD CONSTRAINT "feed_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
