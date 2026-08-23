export const WATCH_LINK_VARIABLES = [
  "ID_IMDB",
  "ID_TMDB",
  "ID_MAL",
  "TITLE",
  "TITLE+",
  "TITLE-",
  "TITLE_ROMANJI",
  "TITLE_ROMANJI+",
  "TITLE_ROMANJI-",
  "SEASON",
  "EPISODE",
] as const;

export const WATCH_LINK_CONTENT_TYPES = ["Anime", "TVShow", "Movie"] as const;

export const MAX_WATCH_LINKS = 20;

export const MAX_WATCH_LINK_URL_LENGTH = 500;

export const BLOCKED_WATCH_LINK_SCHEMES = ["javascript", "data", "vbscript", "file", "blob", "about"];
