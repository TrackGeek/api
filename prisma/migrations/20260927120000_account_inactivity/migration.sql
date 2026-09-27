ALTER TABLE "User"
ADD COLUMN "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "inactivityWarnedAt" TIMESTAMP(3),
ADD COLUMN "inactivityDeletionAt" TIMESTAMP(3);

CREATE INDEX "User_lastActiveAt_inactivityWarnedAt_idx" ON "User"("lastActiveAt", "inactivityWarnedAt");
CREATE INDEX "User_inactivityDeletionAt_idx" ON "User"("inactivityDeletionAt");
