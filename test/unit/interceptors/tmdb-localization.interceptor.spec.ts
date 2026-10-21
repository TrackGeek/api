import { lastValueFrom, of } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TMDBLocalizationInterceptor } from "@/shared/media-localization/tmdb-localization.interceptor";

const tmdb = { getLocalizedMedia: vi.fn() };
const response = { setHeader: vi.fn(), vary: vi.fn() };
const context = (language?: string, type = "http") => ({
  getType: () => type,
  switchToHttp: () => ({
    getRequest: () => ({ get: () => language }),
    getResponse: () => response,
  }),
});

describe("TMDBLocalizationInterceptor", () => {
  let interceptor: TMDBLocalizationInterceptor;

  beforeEach(() => {
    vi.clearAllMocks();
    interceptor = new TMDBLocalizationInterceptor(tmdb as any);
    tmdb.getLocalizedMedia.mockResolvedValue(
      new Map([["movie:1", { title: "Filme", overview: "Sinopse", posterUrl: "pt.jpg" }]]),
    );
  });

  it("uses the viewer's site language and prevents shared HTTP caches from mixing locales", async () => {
    const data = { userId: "library-owner", movie: { tmdbId: 1, title: "Movie", posterUrl: "default.jpg" } };
    const result = await lastValueFrom(interceptor.intercept(context("pt-PT") as any, { handle: () => of(data) }));
    expect(tmdb.getLocalizedMedia).toHaveBeenCalledWith([{ mediaType: "movie", tmdbId: 1 }], "pt-PT");
    expect(result).toMatchObject({ movie: { title: "Filme", overview: "Sinopse", posterUrl: "pt.jpg" } });
    expect(response.vary).toHaveBeenCalledWith("X-TrackGeek-Language");
    expect(response.setHeader).toHaveBeenCalledWith("Cache-Control", "private, no-store");
    expect(data.movie.title).toBe("Movie");
  });

  it("keeps original fields when localization is unavailable", async () => {
    tmdb.getLocalizedMedia.mockResolvedValue(new Map());
    const data = { tvShow: { tmdbId: 1, name: "Show", posterUrl: "default.jpg" } };
    expect(await lastValueFrom(interceptor.intercept(context("pt-BR") as any, { handle: () => of(data) }))).toEqual(
      data,
    );
  });

  it("skips unrelated responses, missing languages and non-HTTP calls", async () => {
    const media = { movie: { tmdbId: 1, title: "Movie", posterUrl: "default.jpg" } };
    await lastValueFrom(
      interceptor.intercept(context("pt-PT") as any, { handle: () => of({ person: { tmdbId: 1 } }) }),
    );
    await lastValueFrom(interceptor.intercept(context() as any, { handle: () => of(media) }));
    await lastValueFrom(interceptor.intercept(context("pt-PT", "rpc") as any, { handle: () => of(media) }));
    expect(tmdb.getLocalizedMedia).not.toHaveBeenCalled();
    expect(response.setHeader).not.toHaveBeenCalled();
  });
});
