-- CreateEnum
CREATE TYPE "CatchupMediaType" AS ENUM ('Anime', 'Manga', 'TvShow', 'Game');

-- CreateEnum
CREATE TYPE "ReleaseEventType" AS ENUM ('NewEpisodeReleased', 'NewChapterReleased', 'NewGameReleased', 'SequelAdded');

-- CreateEnum
CREATE TYPE "ReleaseSource" AS ENUM ('Tenrai', 'Anilist', 'Tmdb', 'Igdb');

-- CreateEnum
CREATE TYPE "CatchupRunStatus" AS ENUM ('Running', 'Success', 'Failed');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'NewEpisodeReleased';
ALTER TYPE "NotificationType" ADD VALUE 'NewChapterReleased';
ALTER TYPE "NotificationType" ADD VALUE 'NewGameReleased';
ALTER TYPE "NotificationType" ADD VALUE 'SequelAdded';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "releaseEventId" TEXT;

-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "gameRelease" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "newChapter" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "newEpisode" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reopenedCompleted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sequelAdded" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "CatchupRun" (
    "id" TEXT NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL,
    "status" "CatchupRunStatus" NOT NULL DEFAULT 'Running',
    "stats" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "CatchupRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseEvent" (
    "id" TEXT NOT NULL,
    "type" "ReleaseEventType" NOT NULL,
    "mediaType" "CatchupMediaType" NOT NULL,
    "source" "ReleaseSource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "unitNumber" INTEGER,
    "containerNumber" INTEGER,
    "unitTitle" TEXT,
    "isAccessory" BOOLEAN NOT NULL DEFAULT false,
    "releaseAt" TIMESTAMP(3) NOT NULL,
    "rawPayload" JSONB,
    "runId" TEXT,
    "animeId" TEXT,
    "mangaId" TEXT,
    "tvShowId" TEXT,
    "gameId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusTransitionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaType" "CatchupMediaType" NOT NULL,
    "fromStatus" "ProgressStatus" NOT NULL,
    "toStatus" "ProgressStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "releaseEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusTransitionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatchupAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "runId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatchupAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatchupRun_runDate_idx" ON "CatchupRun"("runDate");

-- CreateIndex
CREATE INDEX "CatchupRun_status_startedAt_idx" ON "CatchupRun"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseEvent_idempotencyKey_key" ON "ReleaseEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ReleaseEvent_mediaType_releaseAt_idx" ON "ReleaseEvent"("mediaType", "releaseAt");

-- CreateIndex
CREATE INDEX "ReleaseEvent_releaseAt_idx" ON "ReleaseEvent"("releaseAt");

-- CreateIndex
CREATE INDEX "ReleaseEvent_animeId_idx" ON "ReleaseEvent"("animeId");

-- CreateIndex
CREATE INDEX "ReleaseEvent_mangaId_idx" ON "ReleaseEvent"("mangaId");

-- CreateIndex
CREATE INDEX "ReleaseEvent_tvShowId_idx" ON "ReleaseEvent"("tvShowId");

-- CreateIndex
CREATE INDEX "ReleaseEvent_gameId_idx" ON "ReleaseEvent"("gameId");

-- CreateIndex
CREATE INDEX "StatusTransitionLog_userId_createdAt_idx" ON "StatusTransitionLog"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StatusTransitionLog_userId_releaseEventId_key" ON "StatusTransitionLog"("userId", "releaseEventId");

-- CreateIndex
CREATE INDEX "CatchupAuditLog_runId_idx" ON "CatchupAuditLog"("runId");

-- CreateIndex
CREATE INDEX "CatchupAuditLog_action_createdAt_idx" ON "CatchupAuditLog"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_recipientId_releaseEventId_key" ON "Notification"("recipientId", "releaseEventId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_releaseEventId_fkey" FOREIGN KEY ("releaseEventId") REFERENCES "ReleaseEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseEvent" ADD CONSTRAINT "ReleaseEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CatchupRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseEvent" ADD CONSTRAINT "ReleaseEvent_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseEvent" ADD CONSTRAINT "ReleaseEvent_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseEvent" ADD CONSTRAINT "ReleaseEvent_tvShowId_fkey" FOREIGN KEY ("tvShowId") REFERENCES "TVShow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseEvent" ADD CONSTRAINT "ReleaseEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusTransitionLog" ADD CONSTRAINT "StatusTransitionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusTransitionLog" ADD CONSTRAINT "StatusTransitionLog_releaseEventId_fkey" FOREIGN KEY ("releaseEventId") REFERENCES "ReleaseEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatchupAuditLog" ADD CONSTRAINT "CatchupAuditLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CatchupRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
