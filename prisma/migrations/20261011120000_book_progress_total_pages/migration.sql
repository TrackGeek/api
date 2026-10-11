ALTER TABLE "BookProgress" ADD COLUMN "totalPages" INTEGER;

UPDATE "BookProgress" AS progress
SET "totalPages" = book."numberOfPages"
FROM "Book" AS book
WHERE progress."bookId" = book."id"
  AND book."numberOfPages" > 0;
