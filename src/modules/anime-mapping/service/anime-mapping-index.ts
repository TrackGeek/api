export type TmdbMediaType = "movie" | "tv";

export interface AnimeMapping {
  malId: number;
  season: number | null;
  episodeOffset: number;
}

export type AnimeMappingIndex = Map<string, AnimeMapping[]>;

const positiveId = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;

export function buildAnimeMappingIndex(entries: unknown): AnimeMappingIndex {
  if (!Array.isArray(entries)) throw new Error("Anime mapping snapshot must be an array");
  const index: AnimeMappingIndex = new Map();
  for (const entry of entries) {
    if (!entry || !positiveId(entry.mal_id)) continue;
    for (const type of ["movie", "tv"] as const) {
      const rawIds = entry.themoviedb_id?.[type];
      for (const tmdbId of Array.isArray(rawIds) ? rawIds : [rawIds]) {
        if (!positiveId(tmdbId)) continue;
        const key = `${type}:${tmdbId}`;
        const values = index.get(key) ?? [];
        const season = entry.season?.tmdb;
        const offset = entry.episode_offset?.tmdb;
        if (!values.some((value) => value.malId === entry.mal_id)) {
          values.push({
            malId: entry.mal_id,
            season: Number.isInteger(season) && season >= 0 ? season : null,
            episodeOffset: Number.isInteger(offset) ? offset : 0,
          });
        }
        index.set(key, values);
      }
    }
  }
  if (!index.size) throw new Error("Anime mapping snapshot has no usable TMDB mappings");
  for (const values of index.values()) {
    values.sort((a, b) => {
      const rank = (item: AnimeMapping) => item.season === 1 ? -1 : item.season === 0 ? Number.MAX_SAFE_INTEGER : item.season ?? 1;
      return rank(a) - rank(b) || a.malId - b.malId;
    });
  }
  return index;
}

export function mappingForEpisode(mappings: AnimeMapping[], season: number, episode: number): AnimeMapping | undefined {
  return mappings
    .filter((mapping) => mapping.season === season && episode > mapping.episodeOffset)
    .sort((a, b) => b.episodeOffset - a.episodeOffset || a.malId - b.malId)[0];
}
