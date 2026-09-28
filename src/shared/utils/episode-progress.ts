interface EpisodeWatch {
  episode: number;
  season?: number;
}

interface EpisodeSeason {
  seasonNumber: number;
  numberOfEpisodes: number;
}

export function animeEpisodeProgress(total: number | null, watches: EpisodeWatch[]) {
  const watched = new Set(
    watches.map(({ episode }) => episode).filter((episode) => episode > 0 && (!total || episode <= total)),
  );
  let episode = 1;
  while (watched.has(episode)) episode++;

  return {
    current: watched.size,
    total: total || null,
    next: !total || episode <= total ? { episode } : null,
  };
}

export function tvEpisodeProgress(seasons: EpisodeSeason[], watches: EpisodeWatch[], total: number | null) {
  const watched = new Set(watches.map(({ season, episode }) => `${season}:${episode}`));
  let current = 0;
  let episodeTotal = 0;
  let next: { season: number; episode: number } | null = null;

  for (const season of [...seasons].sort((a, b) => a.seasonNumber - b.seasonNumber)) {
    episodeTotal += season.numberOfEpisodes;
    for (let episode = 1; episode <= season.numberOfEpisodes; episode++) {
      if (watched.has(`${season.seasonNumber}:${episode}`)) current++;
      else next ??= { season: season.seasonNumber, episode };
    }
  }

  return { current: seasons.length ? current : watched.size, total: episodeTotal || total || null, next };
}
