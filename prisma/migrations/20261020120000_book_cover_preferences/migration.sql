CREATE TABLE "BookCoverPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "editionId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookCoverPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookCoverPreference_userId_bookId_key" ON "BookCoverPreference"("userId", "bookId");
CREATE INDEX "BookCoverPreference_bookId_idx" ON "BookCoverPreference"("bookId");
ALTER TABLE "BookCoverPreference" ADD CONSTRAINT "BookCoverPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookCoverPreference" ADD CONSTRAINT "BookCoverPreference_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
