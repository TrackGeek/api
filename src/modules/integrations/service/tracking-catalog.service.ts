import { Injectable } from "@nestjs/common";
import { AnimeService } from "@/modules/anime/service/anime.service";
import { BookService } from "@/modules/book/service/book.service";
import { GameService } from "@/modules/game/service/game.service";
import { MangaService } from "@/modules/manga/service/manga.service";
import { MovieService } from "@/modules/movie/service/movie.service";
import { TVShowService } from "@/modules/tv-show/service/tv-show.service";
import { episodesSchema, mediaDetailsSchema, searchMediaSchema } from "../dto/tracking.schema";
import { normalizeMedia } from "../utils/normalize-media";
import { parseIntegrationInput } from "../utils/parse-integration-input";

@Injectable()
export class TrackingCatalogService {
  constructor(
    private readonly anime: AnimeService,
    private readonly manga: MangaService,
    private readonly tv: TVShowService,
    private readonly movie: MovieService,
    private readonly game: GameService,
    private readonly book: BookService,
  ) {}

  async search(input: unknown) {
    const { type, query, page } = parseIntegrationInput(searchMediaSchema, input);
    const search = {
      anime: () => this.anime.searchAnimes({ query, page }),
      manga: () => this.manga.searchMangas({ query, page }),
      tv: () => this.tv.searchTVShows({ query, page }),
      movie: () => this.movie.searchMovies({ query, page }),
      game: () => this.game.searchGames({ query, page }),
      book: () => this.book.searchBooks({ query, page }),
    };
    const result = await search[type]();

    return { ...result, items: result.items.map((item) => normalizeMedia(type, item)) };
  }

  async details(input: unknown) {
    const { type, externalId } = parseIntegrationInput(mediaDetailsSchema, input);
    const detail = {
      anime: () => this.anime.getAnimeByMalId(externalId),
      manga: () => this.manga.getMangaByAnilistId(externalId),
      tv: () => this.tv.getTVShowByTmdbId(externalId),
      movie: () => this.movie.getMovieByTmdbId(externalId),
      game: () => this.game.getGameByIgdbId(externalId),
      book: () => this.book.getBookByHardcoverId(externalId),
    };

    return normalizeMedia(type, await detail[type](), true);
  }

  async episodes(input: unknown) {
    const { type, externalId, season, page } = parseIntegrationInput(episodesSchema, input);
    if (type === "anime") return this.anime.getAnimeEpisodesByMalId({ malId: externalId, page });
    await this.tv.getTVShowByTmdbId(externalId);
    if (season === undefined) return this.tv.getTVShowSeasons(externalId);
    return this.tv.getTVShowSeasonEpisodes(externalId, season);
  }
}
