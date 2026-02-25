-- CreateEnum
CREATE TYPE "FeedEventType" AS ENUM ('NewComment', 'NewFollower', 'NewFavorite', 'NewList', 'NewListItem', 'NewReview', 'NewWatch', 'NewProgress');

-- CreateEnum
CREATE TYPE "WatchStatus" AS ENUM ('Watching', 'Completed', 'Paused', 'Dropped', 'Planning');

-- CreateEnum
CREATE TYPE "ReadStatus" AS ENUM ('Reading', 'Completed', 'Paused', 'Dropped', 'Planning');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('Watching', 'Playing', 'Reading', 'Completed', 'Paused', 'Dropped', 'Planning');

-- CreateEnum
CREATE TYPE "ListType" AS ENUM ('Anime', 'Manga', 'TVShow', 'Movie', 'Game', 'Book');

-- CreateEnum
CREATE TYPE "FavoriteType" AS ENUM ('Anime', 'Manga', 'TVShow', 'Movie', 'Game', 'Book');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
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

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMedal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "medalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMedal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Following" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Following_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
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

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentReaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "reactionId" TEXT NOT NULL,

    CONSTRAINT "CommentReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameComment" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "GameComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookComment" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "BookComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimeComment" (
    "id" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "AnimeComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MangaComment" (
    "id" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "MangaComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TVShowComment" (
    "id" TEXT NOT NULL,
    "tvShowId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "TVShowComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieComment" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "MovieComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileComment" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "ProfileComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedEvent" (
    "id" TEXT NOT NULL,
    "type" "FeedEventType" NOT NULL,
    "userId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedEventReaction" (
    "id" TEXT NOT NULL,
    "feedEventId" TEXT NOT NULL,
    "reactionId" TEXT NOT NULL,

    CONSTRAINT "FeedEventReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
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

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "hardcoverId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "alternativeTitles" JSONB,
    "audioSeconds" INTEGER,
    "bookCategoryId" INTEGER,
    "bookStatus" JSONB,
    "canonical" JSONB,
    "compilation" BOOLEAN,
    "curationStatus" INTEGER,
    "defaultAudioEdition" JSONB,
    "defaultCoverEdition" JSONB,
    "defaultEbookEdition" JSONB,
    "defaultPhysicalEdition" JSONB,
    "description" TEXT,
    "editionsCount" INTEGER,
    "featuredBookSeries" JSONB,
    "headline" TEXT,
    "imageUrl" JSONB,
    "links" JSONB,
    "subtitle" TEXT,
    "literaryTypeId" INTEGER,
    "numberOfPages" INTEGER,
    "releaseDate" TIMESTAMP(3),
    "releaseYear" INTEGER,
    "slug" TEXT NOT NULL,
    "state" TEXT,
    "editions" JSONB,
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anime" (
    "id" TEXT NOT NULL,
    "malId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "imageUrl" TEXT,
    "trailer" JSONB,
    "title" TEXT NOT NULL,
    "titles" JSONB,
    "type" TEXT,
    "source" TEXT,
    "numberOfEpisodes" INTEGER,
    "status" TEXT,
    "aired" JSONB,
    "duration" TEXT,
    "rating" TEXT,
    "rank" INTEGER,
    "popularity" INTEGER,
    "synopsis" TEXT,
    "background" TEXT,
    "season" TEXT,
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
    "videos" JSONB,
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manga" (
    "id" TEXT NOT NULL,
    "malId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "imageUrl" TEXT,
    "title" TEXT NOT NULL,
    "titles" JSONB,
    "type" TEXT,
    "numberOfChapters" INTEGER,
    "numberOfVolumes" INTEGER,
    "status" TEXT,
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

    CONSTRAINT "Manga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TVShow" (
    "id" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "createdBy" JSONB,
    "episodeRuntime" INTEGER[],
    "firstAirDate" TIMESTAMP(3),
    "genres" JSONB,
    "homepage" TEXT,
    "inProduction" BOOLEAN,
    "languages" TEXT[],
    "lastAirDate" TIMESTAMP(3),
    "lastEpisodeToAir" JSONB,
    "name" TEXT,
    "nextEpisodeToAir" TEXT,
    "networks" JSONB,
    "numberOfEpisodes" INTEGER,
    "numberOfSeasons" INTEGER,
    "originCountry" TEXT[],
    "originalLanguage" TEXT,
    "originalName" TEXT,
    "popularity" INTEGER,
    "posterUrl" TEXT,
    "productionCompanies" JSONB,
    "productionCountries" JSONB,
    "seasons" JSONB,
    "status" TEXT,
    "tagline" TEXT,
    "type" TEXT,
    "cast" JSONB,
    "crew" JSONB,
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TVShow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "imdbId" TEXT,
    "belongsToCollection" JSONB,
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
    "releaseDate" TIMESTAMP(3),
    "revenue" INTEGER,
    "runtime" INTEGER,
    "spokenLanguages" JSONB,
    "status" TEXT,
    "title" TEXT,
    "videos" JSONB,
    "cast" JSONB,
    "crew" JSONB,
    "posterUrl" TEXT,
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimeWatch" (
    "id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "episode" INTEGER NOT NULL,
    "status" "WatchStatus" NOT NULL,
    "userId" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimeWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TVShowWatch" (
    "id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "episode" INTEGER NOT NULL,
    "status" "WatchStatus" NOT NULL,
    "userId" TEXT NOT NULL,
    "tvShowId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TVShowWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieWatch" (
    "id" TEXT NOT NULL,
    "status" "WatchStatus" NOT NULL,
    "userId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookRead" (
    "id" TEXT NOT NULL,
    "status" "ReadStatus" NOT NULL,
    "chapter" INTEGER,
    "volume" INTEGER,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MangaRead" (
    "id" TEXT NOT NULL,
    "status" "ReadStatus" NOT NULL,
    "chapter" INTEGER,
    "volume" INTEGER,
    "userId" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MangaRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimeProgress" (
    "id" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL,
    "userId" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MangaProgress" (
    "id" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL,
    "userId" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MangaProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TVShowProgress" (
    "id" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL,
    "userId" TEXT NOT NULL,
    "tvShowId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TVShowProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieProgress" (
    "id" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL,
    "userId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameProgress" (
    "id" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookProgress" (
    "id" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimeReview" (
    "id" TEXT NOT NULL,
    "overall" INTEGER NOT NULL,
    "story" INTEGER NOT NULL,
    "characters" INTEGER NOT NULL,
    "animation" INTEGER NOT NULL,
    "sound" INTEGER NOT NULL,
    "enjoyment" INTEGER NOT NULL,
    "summary" TEXT,
    "pros" TEXT,
    "cons" TEXT,
    "notes" TEXT,
    "recommended" BOOLEAN,
    "userId" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimeReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MangaReview" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "notes" TEXT,
    "screenshots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MangaReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TVShowReview" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "notes" TEXT,
    "screenshots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT NOT NULL,
    "tvShowId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TVShowReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieReview" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "notes" TEXT,
    "screenshots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameReview" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "notes" TEXT,
    "screenshots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookReview" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "notes" TEXT,
    "screenshots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "List" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ListType" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "List_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "animeId" TEXT,
    "mangaId" TEXT,
    "tvShowId" TEXT,
    "movieId" TEXT,
    "gameId" TEXT,
    "bookId" TEXT,

    CONSTRAINT "ListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "type" "FavoriteType" NOT NULL,
    "userId" TEXT NOT NULL,
    "animeId" TEXT,
    "mangaId" TEXT,
    "tvShowId" TEXT,
    "movieId" TEXT,
    "gameId" TEXT,
    "bookId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMedal_userId_medalId_key" ON "UserMedal"("userId", "medalId");

-- CreateIndex
CREATE INDEX "Following_followerId_idx" ON "Following"("followerId");

-- CreateIndex
CREATE INDEX "Following_followingId_idx" ON "Following"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "Following_followerId_followingId_key" ON "Following"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "CommentReaction_commentId_reactionId_key" ON "CommentReaction"("commentId", "reactionId");

-- CreateIndex
CREATE UNIQUE INDEX "GameComment_gameId_commentId_key" ON "GameComment"("gameId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "BookComment_bookId_commentId_key" ON "BookComment"("bookId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "AnimeComment_animeId_commentId_key" ON "AnimeComment"("animeId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "MangaComment_mangaId_commentId_key" ON "MangaComment"("mangaId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "TVShowComment_tvShowId_commentId_key" ON "TVShowComment"("tvShowId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieComment_movieId_commentId_key" ON "MovieComment"("movieId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileComment_profileId_commentId_key" ON "ProfileComment"("profileId", "commentId");

-- CreateIndex
CREATE INDEX "FeedEvent_userId_createdAt_idx" ON "FeedEvent"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeedEventReaction_feedEventId_reactionId_key" ON "FeedEventReaction"("feedEventId", "reactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_igdbId_key" ON "Game"("igdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Book_hardcoverId_key" ON "Book"("hardcoverId");

-- CreateIndex
CREATE UNIQUE INDEX "Anime_malId_key" ON "Anime"("malId");

-- CreateIndex
CREATE UNIQUE INDEX "Manga_malId_key" ON "Manga"("malId");

-- CreateIndex
CREATE UNIQUE INDEX "TVShow_tmdbId_key" ON "TVShow"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");

-- CreateIndex
CREATE INDEX "AnimeWatch_userId_idx" ON "AnimeWatch"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AnimeWatch_userId_animeId_key" ON "AnimeWatch"("userId", "animeId");

-- CreateIndex
CREATE INDEX "TVShowWatch_userId_idx" ON "TVShowWatch"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TVShowWatch_userId_tvShowId_key" ON "TVShowWatch"("userId", "tvShowId");

-- CreateIndex
CREATE INDEX "MovieWatch_userId_idx" ON "MovieWatch"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieWatch_userId_movieId_key" ON "MovieWatch"("userId", "movieId");

-- CreateIndex
CREATE INDEX "BookRead_userId_idx" ON "BookRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BookRead_userId_bookId_key" ON "BookRead"("userId", "bookId");

-- CreateIndex
CREATE INDEX "MangaRead_userId_idx" ON "MangaRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MangaRead_userId_mangaId_key" ON "MangaRead"("userId", "mangaId");

-- CreateIndex
CREATE INDEX "AnimeProgress_userId_idx" ON "AnimeProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AnimeProgress_userId_animeId_key" ON "AnimeProgress"("userId", "animeId");

-- CreateIndex
CREATE INDEX "MangaProgress_userId_idx" ON "MangaProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MangaProgress_userId_mangaId_key" ON "MangaProgress"("userId", "mangaId");

-- CreateIndex
CREATE INDEX "TVShowProgress_userId_idx" ON "TVShowProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TVShowProgress_userId_tvShowId_key" ON "TVShowProgress"("userId", "tvShowId");

-- CreateIndex
CREATE INDEX "MovieProgress_userId_idx" ON "MovieProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieProgress_userId_movieId_key" ON "MovieProgress"("userId", "movieId");

-- CreateIndex
CREATE INDEX "GameProgress_userId_idx" ON "GameProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GameProgress_userId_gameId_key" ON "GameProgress"("userId", "gameId");

-- CreateIndex
CREATE INDEX "BookProgress_userId_idx" ON "BookProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BookProgress_userId_bookId_key" ON "BookProgress"("userId", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "AnimeReview_userId_animeId_key" ON "AnimeReview"("userId", "animeId");

-- CreateIndex
CREATE UNIQUE INDEX "MangaReview_userId_mangaId_key" ON "MangaReview"("userId", "mangaId");

-- CreateIndex
CREATE UNIQUE INDEX "TVShowReview_userId_tvShowId_key" ON "TVShowReview"("userId", "tvShowId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieReview_userId_movieId_key" ON "MovieReview"("userId", "movieId");

-- CreateIndex
CREATE UNIQUE INDEX "GameReview_userId_gameId_key" ON "GameReview"("userId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "BookReview_userId_bookId_key" ON "BookReview"("userId", "bookId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMedal" ADD CONSTRAINT "UserMedal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMedal" ADD CONSTRAINT "UserMedal_medalId_fkey" FOREIGN KEY ("medalId") REFERENCES "Medal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Following" ADD CONSTRAINT "Following_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Following" ADD CONSTRAINT "Following_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_reactionId_fkey" FOREIGN KEY ("reactionId") REFERENCES "Reaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameComment" ADD CONSTRAINT "GameComment_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameComment" ADD CONSTRAINT "GameComment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookComment" ADD CONSTRAINT "BookComment_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookComment" ADD CONSTRAINT "BookComment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeComment" ADD CONSTRAINT "AnimeComment_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeComment" ADD CONSTRAINT "AnimeComment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaComment" ADD CONSTRAINT "MangaComment_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaComment" ADD CONSTRAINT "MangaComment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TVShowComment" ADD CONSTRAINT "TVShowComment_tvShowId_fkey" FOREIGN KEY ("tvShowId") REFERENCES "TVShow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TVShowComment" ADD CONSTRAINT "TVShowComment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieComment" ADD CONSTRAINT "MovieComment_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieComment" ADD CONSTRAINT "MovieComment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileComment" ADD CONSTRAINT "ProfileComment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileComment" ADD CONSTRAINT "ProfileComment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedEvent" ADD CONSTRAINT "FeedEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedEventReaction" ADD CONSTRAINT "FeedEventReaction_feedEventId_fkey" FOREIGN KEY ("feedEventId") REFERENCES "FeedEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedEventReaction" ADD CONSTRAINT "FeedEventReaction_reactionId_fkey" FOREIGN KEY ("reactionId") REFERENCES "Reaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeWatch" ADD CONSTRAINT "AnimeWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeWatch" ADD CONSTRAINT "AnimeWatch_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TVShowWatch" ADD CONSTRAINT "TVShowWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TVShowWatch" ADD CONSTRAINT "TVShowWatch_tvShowId_fkey" FOREIGN KEY ("tvShowId") REFERENCES "TVShow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieWatch" ADD CONSTRAINT "MovieWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieWatch" ADD CONSTRAINT "MovieWatch_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookRead" ADD CONSTRAINT "BookRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookRead" ADD CONSTRAINT "BookRead_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaRead" ADD CONSTRAINT "MangaRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaRead" ADD CONSTRAINT "MangaRead_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeProgress" ADD CONSTRAINT "AnimeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeProgress" ADD CONSTRAINT "AnimeProgress_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaProgress" ADD CONSTRAINT "MangaProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaProgress" ADD CONSTRAINT "MangaProgress_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TVShowProgress" ADD CONSTRAINT "TVShowProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TVShowProgress" ADD CONSTRAINT "TVShowProgress_tvShowId_fkey" FOREIGN KEY ("tvShowId") REFERENCES "TVShow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieProgress" ADD CONSTRAINT "MovieProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieProgress" ADD CONSTRAINT "MovieProgress_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameProgress" ADD CONSTRAINT "GameProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameProgress" ADD CONSTRAINT "GameProgress_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookProgress" ADD CONSTRAINT "BookProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookProgress" ADD CONSTRAINT "BookProgress_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeReview" ADD CONSTRAINT "AnimeReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeReview" ADD CONSTRAINT "AnimeReview_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaReview" ADD CONSTRAINT "MangaReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaReview" ADD CONSTRAINT "MangaReview_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TVShowReview" ADD CONSTRAINT "TVShowReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TVShowReview" ADD CONSTRAINT "TVShowReview_tvShowId_fkey" FOREIGN KEY ("tvShowId") REFERENCES "TVShow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieReview" ADD CONSTRAINT "MovieReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieReview" ADD CONSTRAINT "MovieReview_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameReview" ADD CONSTRAINT "GameReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameReview" ADD CONSTRAINT "GameReview_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookReview" ADD CONSTRAINT "BookReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookReview" ADD CONSTRAINT "BookReview_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_tvShowId_fkey" FOREIGN KEY ("tvShowId") REFERENCES "TVShow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_tvShowId_fkey" FOREIGN KEY ("tvShowId") REFERENCES "TVShow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
