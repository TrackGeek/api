import { Prisma } from "@prisma/generated/client";
import { describe, expect, it } from "vitest";
import { applyTmdbLocalizations, collectTmdbMedia } from "@/shared/media-localization/tmdb-localization-response";

describe("TMDB localized responses", () => {
  const localized = new Map([
    ["movie:1", { title: "Filme", overview: "Sinopse do filme", posterUrl: "movie-pt.jpg" }],
    ["tv:1", { title: "Série", overview: "Sinopse da série", posterUrl: "tv-pt.jpg" }],
  ]);

  it("localizes nested libraries, lists, favorites and feed references without mixing media ids", () => {
    const movie = { tmdbId: 1, title: "Movie", overview: "Overview", posterUrl: "movie.jpg" };
    const tvShow = { tmdbId: 1, name: "Show", tagline: "Tagline", posterUrl: "show.jpg" };
    const data = { items: [{ movie }, { tvShow }, { metadata: { favorite: { movie } } }] };

    expect(collectTmdbMedia(data)).toEqual([
      { mediaType: "movie", tmdbId: 1 },
      { mediaType: "tv", tmdbId: 1 },
      { mediaType: "movie", tmdbId: 1 },
    ]);
    const result = applyTmdbLocalizations(data, localized) as typeof data;
    expect(result.items[0]).toMatchObject({
      movie: { title: "Filme", posterUrl: "movie-pt.jpg", overview: "Sinopse do filme" },
    });
    expect(result.items[1]).toMatchObject({
      tvShow: { name: "Série", posterUrl: "tv-pt.jpg", tagline: "Sinopse da série", overview: "Sinopse da série" },
    });
    expect(result.items[2]).toMatchObject({ metadata: { favorite: { movie: { title: "Filme" } } } });
    expect(movie.title).toBe("Movie");
    expect(tvShow.name).toBe("Show");
  });

  it("distinguishes top movies and TV shows that both use name", () => {
    const data = {
      movies: { items: [{ tmdbId: 1, name: "Movie", releaseDate: null, posterUrl: null }] },
      topTVShows: { items: [{ tmdbId: 1, name: "Show", firstAirDate: null, posterUrl: null }] },
    };
    const result = applyTmdbLocalizations(data, localized) as typeof data;
    expect(result.movies.items[0].name).toBe("Filme");
    expect(result.topTVShows.items[0].name).toBe("Série");
  });

  it("localizes person credits and company works while preserving other providers", () => {
    const data = {
      works: [
        { key: "movie:1", id: 1, title: "Movie", imageUrl: "movie.jpg" },
        { key: "tv:1", id: 1, mediaType: "tv", title: "Show", imageUrl: "show.jpg" },
        { key: "anime:1", id: 1, title: "Anime", imageUrl: "anime.jpg" },
      ],
      person: { tmdbId: 1, name: "Actor", imageUrl: "actor.jpg" },
    };
    expect(collectTmdbMedia(data)).toEqual([
      { mediaType: "movie", tmdbId: 1 },
      { mediaType: "tv", tmdbId: 1 },
    ]);
    const result = applyTmdbLocalizations(data, localized) as typeof data;
    expect(result.works[0]).toMatchObject({ title: "Filme", imageUrl: "movie-pt.jpg" });
    expect(result.works[1]).toMatchObject({ title: "Série", imageUrl: "tv-pt.jpg" });
    expect(result.works[2]).toEqual(data.works[2]);
    expect(result.person).toEqual(data.person);
  });

  it("falls back per missing field and preserves shared source data and serialization", () => {
    const date = new Date();
    const rating = new Prisma.Decimal("4.5");
    const data = { tmdbId: 1, title: "Movie", overview: "Overview", posterUrl: "movie.jpg", date, rating };
    const result = applyTmdbLocalizations(
      data,
      new Map([["movie:1", { title: "Filme", overview: null, posterUrl: null }]]),
    ) as typeof data;
    expect(result).toMatchObject({ title: "Filme", overview: "Overview", posterUrl: "movie.jpg" });
    expect(result.date).toBe(date);
    expect(result.rating).toBe(rating);
    expect(applyTmdbLocalizations(data, new Map())).toEqual(data);
    expect(data.title).toBe("Movie");
    expect(collectTmdbMedia({ date, rating, tmdbId: -1, posterUrl: null })).toEqual([]);
  });
});
