import type { BookCover } from "../service/book-cover.service";

type BookRecord = Record<string, unknown> & { hardcoverId: number };

function isBook(value: Record<string, unknown>): value is BookRecord {
  return Number.isInteger(value.hardcoverId) && "imageUrl" in value;
}

export function collectBookIds(value: unknown): number[] {
  if (
    !value ||
    typeof value !== "object" ||
    (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype)
  )
    return [];
  if (Array.isArray(value)) return value.flatMap(collectBookIds);
  const record = value as Record<string, unknown>;
  return [...(isBook(record) ? [record.hardcoverId] : []), ...Object.values(record).flatMap(collectBookIds)];
}

export function applyBookCovers(value: unknown, covers: Map<number, BookCover>): unknown {
  if (
    !value ||
    typeof value !== "object" ||
    (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype)
  )
    return value;
  if (Array.isArray(value)) return value.map((item) => applyBookCovers(item, covers));
  const record = value as Record<string, unknown>;
  const result = Object.fromEntries(Object.entries(record).map(([key, item]) => [key, applyBookCovers(item, covers)]));
  if (isBook(record)) {
    const cover = covers.get(record.hardcoverId);
    result.coverEditionId = cover?.editionId ?? null;
    result.customCoverEditionId = cover?.custom ? cover.editionId : null;
    if (cover) result.imageUrl = cover.imageUrl;
  }
  return result;
}
