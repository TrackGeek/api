export interface TgScoredContent {
  id: string;
  tgReviewScore: number;
}

/** Prisma delegates are too generic to describe structurally, so `groupBy` is kept loose here. */
interface ReviewGroupByDelegate {
  groupBy(args: any): Promise<unknown>;
}

/**
 * Content reviewed on TrackGeek with an average `overall` at or above `minTgScore`.
 * The rating filter can only ever match content we already store, so callers use this
 * to drive a local search instead of querying the upstream provider.
 */
export async function getTgScoredContent(
  reviewDelegate: ReviewGroupByDelegate,
  foreignKey: string,
  minTgScore: number,
): Promise<TgScoredContent[]> {
  const groups = (await reviewDelegate.groupBy({
    by: [foreignKey],
    _avg: { overall: true },
    having: { overall: { _avg: { gte: minTgScore } } },
  })) as Record<string, any>[];

  return groups.map((group) => ({
    id: group[foreignKey] as string,
    tgReviewScore: parseFloat(Number(group._avg.overall).toFixed(1)),
  }));
}

export function paginateLocal<I>(items: I[], page: number, itemsPerPage: number) {
  const start = (page - 1) * itemsPerPage;
  const paged = items.slice(start, start + itemsPerPage);

  return {
    total: items.length,
    pages: Math.max(1, Math.ceil(items.length / itemsPerPage)),
    inPage: page,
    itemsInPage: paged.length,
    itemsPerPage,
    items: paged,
  };
}

/** Provider payloads store genre-like lists either as plain strings or as `{ name }` objects. */
export function toNameList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === "string") return entry;

      if (entry && typeof entry === "object") {
        const name = (entry as Record<string, unknown>).name;

        return typeof name === "string" ? name : null;
      }

      return null;
    })
    .filter((name): name is string => !!name);
}

export function matchesAllNames(value: unknown, wanted?: string[]): boolean {
  if (!wanted?.length) return true;

  const names = toNameList(value).map((name) => name.toLowerCase());

  return wanted.every((entry) => names.includes(entry.toLowerCase()));
}

/** IGDB-style lists carry both `name` and `slug`, and filters may arrive as either. */
export function toTokenList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (typeof entry === "string") return [normalizeToken(entry)];

    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;

      return [record.name, record.slug]
        .filter((token): token is string => typeof token === "string")
        .map(normalizeToken);
    }

    return [];
  });
}

export function matchesAllTokens(value: unknown, wanted?: string[]): boolean {
  if (!wanted?.length) return true;

  const tokens = toTokenList(value);

  return wanted.every((entry) => tokens.includes(normalizeToken(entry)));
}

export function matchesAnyToken(value: unknown, wanted?: string[]): boolean {
  if (!wanted?.length) return true;

  const tokens = toTokenList(value);

  return wanted.some((entry) => tokens.includes(normalizeToken(entry)));
}

/** Collapses `TV Special`, `tv_special` and `tvSpecial` onto the same token. */
export function normalizeToken(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matchesQuery(title: string | null | undefined, query?: string): boolean {
  if (!query) return true;

  return (title ?? "").toLowerCase().includes(query.toLowerCase());
}

export function compareBy<I>(items: I[], value: (item: I) => number | string | null, sort: string) {
  return [...items].sort((a, b) => {
    const aVal = value(a) ?? 0;
    const bVal = value(b) ?? 0;

    if (aVal < bVal) return sort === "asc" ? -1 : 1;
    if (aVal > bVal) return sort === "asc" ? 1 : -1;

    return 0;
  });
}
