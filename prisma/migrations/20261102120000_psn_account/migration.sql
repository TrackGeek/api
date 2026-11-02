CREATE TABLE "PsnAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "onlineId" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "refreshToken" TEXT NOT NULL,
    "expired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsnAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PsnAccount_userId_key" ON "PsnAccount"("userId");
ALTER TABLE "PsnAccount" ADD CONSTRAINT "PsnAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
