-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('User', 'Moderator', 'Administrator');

-- CreateEnum
CREATE TYPE "UserTier" AS ENUM ('Tracker', 'Archivist', 'ArchiveMaster');

-- CreateEnum
CREATE TYPE "CommentType" AS ENUM ('Anime', 'Manga', 'TVShow', 'Movie', 'Game', 'Book', 'Profile');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('Comment', 'Activity', 'GameReview', 'AnimeReview', 'MangaReview', 'TvShowReview', 'MovieReview', 'BookReview');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('System', 'CommentOnProfile', 'ReactionOnComment', 'ReactionOnActivity', 'ReactionOnAnimeReview', 'ReactionOnMangaReview', 'ReactionOnTvShowReview', 'ReactionOnMovieReview', 'ReactionOnGameReview', 'ReactionOnBookReview');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('AccountCreated', 'ListCreated', 'ListItemAdded', 'FavoriteAdded', 'ReviewAdded', 'ProgressStarted', 'ProgressCompleted', 'Watched', 'Followed', 'MedalEarned');

-- CreateEnum
CREATE TYPE "WatchEpisodeStatus" AS ENUM ('NotWatched', 'Watching', 'Completed', 'Paused', 'Dropped', 'Planning');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('NotWatched', 'NotRead', 'NotPlayed', 'Watching', 'Playing', 'Reading', 'Completed', 'Paused', 'Dropped', 'Planning');

-- CreateEnum
CREATE TYPE "ListType" AS ENUM ('Anime', 'Manga', 'TVShow', 'Movie', 'Game', 'Book');

-- CreateEnum
CREATE TYPE "FavoriteType" AS ENUM ('Anime', 'Manga', 'TVShow', 'Movie', 'Game', 'Book');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Pending', 'Succeeded', 'Failed');

-- CreateEnum
CREATE TYPE "PaymentFrequency" AS ENUM ('OneTime', 'Monthly');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "username" TEXT,
    "displayUsername" TEXT,
    "tier" "UserTier",
    "tierStartedAt" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'User',
    "stripeCustomerId" TEXT,
    "accumulatedMoney" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "CommentType" NOT NULL,
    "userId" TEXT NOT NULL,
    "animeId" TEXT,
    "mangaId" TEXT,
    "tvShowId" TEXT,
    "movieId" TEXT,
    "gameId" TEXT,
    "bookId" TEXT,
    "profileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "userId" TEXT NOT NULL,
    "commentId" TEXT,
    "activityId" TEXT,
    "gameReviewId" TEXT,
    "animeReviewId" TEXT,
    "mangaReviewId" TEXT,
    "tvShowReviewId" TEXT,
    "movieReviewId" TEXT,
    "bookReviewId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileId" TEXT,
    "commentId" TEXT,
    "reactionId" TEXT,
    "activityId" TEXT,
    "animeReviewId" TEXT,
    "mangaReviewId" TEXT,
    "tvShowReviewId" TEXT,
    "movieReviewId" TEXT,
    "gameReviewId" TEXT,
    "bookReviewId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "userId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listId" TEXT,
    "listItemId" TEXT,
    "favoriteId" TEXT,
    "animeReviewId" TEXT,
    "mangaReviewId" TEXT,
    "tvShowReviewId" TEXT,
    "movieReviewId" TEXT,
    "gameReviewId" TEXT,
    "bookReviewId" TEXT,
    "animeProgressId" TEXT,
    "mangaProgressId" TEXT,
    "tvShowProgressId" TEXT,
    "movieProgressId" TEXT,
    "gameProgressId" TEXT,
    "bookProgressId" TEXT,
    "animeEpisodeWatchId" TEXT,
    "tvShowEpisodeWatchId" TEXT,
    "followingId" TEXT,
    "userMedalId" TEXT,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "igdbId" INTEGER NOT NULL,
    "igdbReviewScore" DOUBLE PRECISION,
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
    "gameStatus" TEXT,
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
    "themes" TEXT[],
    "totalRating" DOUBLE PRECISION,
    "totalRatingCount" INTEGER,
    "versionParent" JSONB,
    "versionTitle" JSONB,
    "videos" JSONB,
    "websites" JSONB,
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "hardcoverId" INTEGER NOT NULL,
    "hardcoverReviewScore" DOUBLE PRECISION,
    "title" TEXT NOT NULL,
    "contributions" JSONB,
    "alternativeTitles" JSONB,
    "audioSeconds" INTEGER,
    "taggings" JSONB,
    "bookCategory" JSONB,
    "bookStatus" JSONB,
    "bookSeries" JSONB,
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
    "isAdult" BOOLEAN,
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
    "episodes" JSONB,
    "malReviewScore" DOUBLE PRECISION,
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
    "isAdult" BOOLEAN,
    "malReviewScore" DOUBLE PRECISION,
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
    "isAdult" BOOLEAN,
    "tmdbReviewScore" DOUBLE PRECISION,
    "homepage" TEXT,
    "inProduction" BOOLEAN,
    "languages" TEXT[],
    "backdropUrl" TEXT,
    "lastAirDate" TIMESTAMP(3),
    "lastEpisodeToAir" JSONB,
    "name" TEXT,
    "nextEpisodeToAir" JSONB,
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
    "episodes" JSONB,
    "status" TEXT,
    "tagline" TEXT,
    "type" TEXT,
    "cast" JSONB,
    "crew" JSONB,
    "trailerId" TEXT,
    "external" JSONB,
    "backdrops" TEXT[],
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
    "isAdult" BOOLEAN,
    "tmdbReviewScore" DOUBLE PRECISION,
    "belongsToCollection" JSONB,
    "budget" INTEGER,
    "genres" JSONB,
    "backdropUrl" TEXT,
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
    "trailerId" TEXT,
    "external" JSONB,
    "backdrops" TEXT[],
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimeEpisodeWatch" (
    "id" TEXT NOT NULL,
    "status" "WatchEpisodeStatus" NOT NULL,
    "episode" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimeEpisodeWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TVShowEpisodeWatch" (
    "id" TEXT NOT NULL,
    "status" "WatchEpisodeStatus" NOT NULL,
    "season" INTEGER NOT NULL,
    "episode" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "tvShowId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TVShowEpisodeWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimeProgress" (
    "id" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL,
    "watchCount" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
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
    "chaptersRead" INTEGER,
    "readCount" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
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
    "watchCount" INTEGER,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
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
    "watchCount" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
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
    "playCount" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
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
    "chaptersRead" INTEGER,
    "readCount" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimeReview" (
    "id" TEXT NOT NULL,
    "overall" DECIMAL(65,30) NOT NULL,
    "story" DECIMAL(65,30),
    "characters" DECIMAL(65,30),
    "animation" DECIMAL(65,30),
    "sound" DECIMAL(65,30),
    "enjoyment" DECIMAL(65,30),
    "summary" TEXT,
    "notes" TEXT,
    "pros" TEXT,
    "cons" TEXT,
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
    "overall" DECIMAL(65,30) NOT NULL,
    "art" DECIMAL(65,30),
    "worldbuilding" DECIMAL(65,30),
    "summary" TEXT,
    "notes" TEXT,
    "story" TEXT,
    "characters" TEXT,
    "recommended" BOOLEAN,
    "userId" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MangaReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TVShowReview" (
    "id" TEXT NOT NULL,
    "overall" DECIMAL(65,30) NOT NULL,
    "direction" DECIMAL(65,30),
    "production" DECIMAL(65,30),
    "acting" DECIMAL(65,30),
    "summary" TEXT,
    "notes" TEXT,
    "story" TEXT,
    "recommended" BOOLEAN,
    "userId" TEXT NOT NULL,
    "tvShowId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TVShowReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieReview" (
    "id" TEXT NOT NULL,
    "overall" DECIMAL(65,30) NOT NULL,
    "direction" DECIMAL(65,30),
    "production" DECIMAL(65,30),
    "acting" DECIMAL(65,30),
    "summary" TEXT,
    "notes" TEXT,
    "story" TEXT,
    "recommended" BOOLEAN,
    "userId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameReview" (
    "id" TEXT NOT NULL,
    "overall" DECIMAL(65,30) NOT NULL,
    "graphics" DECIMAL(65,30),
    "sound" DECIMAL(65,30),
    "story" DECIMAL(65,30),
    "gameplay" DECIMAL(65,30),
    "platform" TEXT,
    "summary" TEXT,
    "notes" TEXT,
    "recommended" BOOLEAN,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameReviewScreenshot" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "isSpoiler" BOOLEAN NOT NULL,
    "gameReviewId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameReviewScreenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookReview" (
    "id" TEXT NOT NULL,
    "overall" DECIMAL(65,30) NOT NULL,
    "characters" DECIMAL(65,30),
    "language" DECIMAL(65,30),
    "theme" DECIMAL(65,30),
    "summary" TEXT,
    "notes" TEXT,
    "recommended" BOOLEAN,
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
    "position" INTEGER,
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
    "position" INTEGER,
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

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "frequency" "PaymentFrequency" NOT NULL,
    "stripeInvoiceUrl" TEXT,
    "stripeChargeId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeCheckoutSessionUrl" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeProductId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Medal_name_key" ON "Medal"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserMedal_userId_medalId_key" ON "UserMedal"("userId", "medalId");

-- CreateIndex
CREATE INDEX "Following_followingId_idx" ON "Following"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "Following_followerId_followingId_key" ON "Following"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "Comment_animeId_idx" ON "Comment"("animeId");

-- CreateIndex
CREATE INDEX "Comment_mangaId_idx" ON "Comment"("mangaId");

-- CreateIndex
CREATE INDEX "Comment_tvShowId_idx" ON "Comment"("tvShowId");

-- CreateIndex
CREATE INDEX "Comment_movieId_idx" ON "Comment"("movieId");

-- CreateIndex
CREATE INDEX "Comment_gameId_idx" ON "Comment"("gameId");

-- CreateIndex
CREATE INDEX "Comment_bookId_idx" ON "Comment"("bookId");

-- CreateIndex
CREATE INDEX "Comment_profileId_idx" ON "Comment"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_commentId_key" ON "Reaction"("userId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_activityId_key" ON "Reaction"("userId", "activityId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_gameReviewId_key" ON "Reaction"("userId", "gameReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_animeReviewId_key" ON "Reaction"("userId", "animeReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_mangaReviewId_key" ON "Reaction"("userId", "mangaReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_tvShowReviewId_key" ON "Reaction"("userId", "tvShowReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_movieReviewId_key" ON "Reaction"("userId", "movieReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_bookReviewId_key" ON "Reaction"("userId", "bookReviewId");

-- CreateIndex
CREATE INDEX "Notification_recipientId_readAt_idx" ON "Notification"("recipientId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_createdAt_idx" ON "Notification"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");

-- CreateIndex
CREATE INDEX "Activity_type_idx" ON "Activity"("type");

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
CREATE INDEX "AnimeEpisodeWatch_userId_status_idx" ON "AnimeEpisodeWatch"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AnimeEpisodeWatch_userId_animeId_episode_key" ON "AnimeEpisodeWatch"("userId", "animeId", "episode");

-- CreateIndex
CREATE INDEX "TVShowEpisodeWatch_userId_status_idx" ON "TVShowEpisodeWatch"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TVShowEpisodeWatch_userId_tvShowId_season_episode_key" ON "TVShowEpisodeWatch"("userId", "tvShowId", "season", "episode");

-- CreateIndex
CREATE UNIQUE INDEX "AnimeProgress_userId_animeId_key" ON "AnimeProgress"("userId", "animeId");

-- CreateIndex
CREATE UNIQUE INDEX "MangaProgress_userId_mangaId_key" ON "MangaProgress"("userId", "mangaId");

-- CreateIndex
CREATE UNIQUE INDEX "TVShowProgress_userId_tvShowId_key" ON "TVShowProgress"("userId", "tvShowId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieProgress_userId_movieId_key" ON "MovieProgress"("userId", "movieId");

-- CreateIndex
CREATE UNIQUE INDEX "GameProgress_userId_gameId_key" ON "GameProgress"("userId", "gameId");

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
CREATE INDEX "GameReviewScreenshot_gameReviewId_idx" ON "GameReviewScreenshot"("gameReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "BookReview_userId_bookId_key" ON "BookReview"("userId", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "List_userId_name_key" ON "List"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ListItem_listId_animeId_key" ON "ListItem"("listId", "animeId");

-- CreateIndex
CREATE UNIQUE INDEX "ListItem_listId_mangaId_key" ON "ListItem"("listId", "mangaId");

-- CreateIndex
CREATE UNIQUE INDEX "ListItem_listId_tvShowId_key" ON "ListItem"("listId", "tvShowId");

-- CreateIndex
CREATE UNIQUE INDEX "ListItem_listId_movieId_key" ON "ListItem"("listId", "movieId");

-- CreateIndex
CREATE UNIQUE INDEX "ListItem_listId_gameId_key" ON "ListItem"("listId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "ListItem_listId_bookId_key" ON "ListItem"("listId", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_animeId_key" ON "Favorite"("userId", "animeId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_mangaId_key" ON "Favorite"("userId", "mangaId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_tvShowId_key" ON "Favorite"("userId", "tvShowId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_movieId_key" ON "Favorite"("userId", "movieId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_gameId_key" ON "Favorite"("userId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_bookId_key" ON "Favorite"("userId", "bookId");

-- CreateIndex
CREATE INDEX "Payment_userId_status_createdAt_idx" ON "Payment"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_stripeProductId_idx" ON "Payment"("stripeProductId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeCheckoutSessionId_key" ON "Payment"("stripeCheckoutSessionId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_tvShowId_fkey" FOREIGN KEY ("tvShowId") REFERENCES "TVShow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_gameReviewId_fkey" FOREIGN KEY ("gameReviewId") REFERENCES "GameReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_animeReviewId_fkey" FOREIGN KEY ("animeReviewId") REFERENCES "AnimeReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_mangaReviewId_fkey" FOREIGN KEY ("mangaReviewId") REFERENCES "MangaReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_tvShowReviewId_fkey" FOREIGN KEY ("tvShowReviewId") REFERENCES "TVShowReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_movieReviewId_fkey" FOREIGN KEY ("movieReviewId") REFERENCES "MovieReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_bookReviewId_fkey" FOREIGN KEY ("bookReviewId") REFERENCES "BookReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_reactionId_fkey" FOREIGN KEY ("reactionId") REFERENCES "Reaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_animeReviewId_fkey" FOREIGN KEY ("animeReviewId") REFERENCES "AnimeReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_mangaReviewId_fkey" FOREIGN KEY ("mangaReviewId") REFERENCES "MangaReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tvShowReviewId_fkey" FOREIGN KEY ("tvShowReviewId") REFERENCES "TVShowReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_movieReviewId_fkey" FOREIGN KEY ("movieReviewId") REFERENCES "MovieReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_gameReviewId_fkey" FOREIGN KEY ("gameReviewId") REFERENCES "GameReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_bookReviewId_fkey" FOREIGN KEY ("bookReviewId") REFERENCES "BookReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_listItemId_fkey" FOREIGN KEY ("listItemId") REFERENCES "ListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_favoriteId_fkey" FOREIGN KEY ("favoriteId") REFERENCES "Favorite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_animeReviewId_fkey" FOREIGN KEY ("animeReviewId") REFERENCES "AnimeReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_mangaReviewId_fkey" FOREIGN KEY ("mangaReviewId") REFERENCES "MangaReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_tvShowReviewId_fkey" FOREIGN KEY ("tvShowReviewId") REFERENCES "TVShowReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_movieReviewId_fkey" FOREIGN KEY ("movieReviewId") REFERENCES "MovieReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_gameReviewId_fkey" FOREIGN KEY ("gameReviewId") REFERENCES "GameReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_bookReviewId_fkey" FOREIGN KEY ("bookReviewId") REFERENCES "BookReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_animeProgressId_fkey" FOREIGN KEY ("animeProgressId") REFERENCES "AnimeProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_mangaProgressId_fkey" FOREIGN KEY ("mangaProgressId") REFERENCES "MangaProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_tvShowProgressId_fkey" FOREIGN KEY ("tvShowProgressId") REFERENCES "TVShowProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_movieProgressId_fkey" FOREIGN KEY ("movieProgressId") REFERENCES "MovieProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_gameProgressId_fkey" FOREIGN KEY ("gameProgressId") REFERENCES "GameProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_bookProgressId_fkey" FOREIGN KEY ("bookProgressId") REFERENCES "BookProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_animeEpisodeWatchId_fkey" FOREIGN KEY ("animeEpisodeWatchId") REFERENCES "AnimeEpisodeWatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_tvShowEpisodeWatchId_fkey" FOREIGN KEY ("tvShowEpisodeWatchId") REFERENCES "TVShowEpisodeWatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "Following"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userMedalId_fkey" FOREIGN KEY ("userMedalId") REFERENCES "UserMedal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeEpisodeWatch" ADD CONSTRAINT "AnimeEpisodeWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeEpisodeWatch" ADD CONSTRAINT "AnimeEpisodeWatch_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TVShowEpisodeWatch" ADD CONSTRAINT "TVShowEpisodeWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TVShowEpisodeWatch" ADD CONSTRAINT "TVShowEpisodeWatch_tvShowId_fkey" FOREIGN KEY ("tvShowId") REFERENCES "TVShow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeProgress" ADD CONSTRAINT "AnimeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeProgress" ADD CONSTRAINT "AnimeProgress_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaProgress" ADD CONSTRAINT "MangaProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaProgress" ADD CONSTRAINT "MangaProgress_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TVShowProgress" ADD CONSTRAINT "TVShowProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TVShowProgress" ADD CONSTRAINT "TVShowProgress_tvShowId_fkey" FOREIGN KEY ("tvShowId") REFERENCES "TVShow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieProgress" ADD CONSTRAINT "MovieProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieProgress" ADD CONSTRAINT "MovieProgress_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameProgress" ADD CONSTRAINT "GameProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameProgress" ADD CONSTRAINT "GameProgress_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookProgress" ADD CONSTRAINT "BookProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookProgress" ADD CONSTRAINT "BookProgress_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeReview" ADD CONSTRAINT "AnimeReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeReview" ADD CONSTRAINT "AnimeReview_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaReview" ADD CONSTRAINT "MangaReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaReview" ADD CONSTRAINT "MangaReview_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TVShowReview" ADD CONSTRAINT "TVShowReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TVShowReview" ADD CONSTRAINT "TVShowReview_tvShowId_fkey" FOREIGN KEY ("tvShowId") REFERENCES "TVShow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieReview" ADD CONSTRAINT "MovieReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieReview" ADD CONSTRAINT "MovieReview_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameReview" ADD CONSTRAINT "GameReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameReview" ADD CONSTRAINT "GameReview_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameReviewScreenshot" ADD CONSTRAINT "GameReviewScreenshot_gameReviewId_fkey" FOREIGN KEY ("gameReviewId") REFERENCES "GameReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookReview" ADD CONSTRAINT "BookReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookReview" ADD CONSTRAINT "BookReview_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
