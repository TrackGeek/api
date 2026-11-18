-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "showChatPresence" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "chatLastSeenAt" TIMESTAMP(3);
