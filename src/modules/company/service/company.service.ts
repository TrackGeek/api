import { Injectable } from "@nestjs/common";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";

export type CompanyMediaType = "movie" | "tv" | "anime" | "game";

export interface CompanyWork {
  key: string;
  id: number;
  title: string;
  imageUrl: string | null;
  backdropUrl: string | null;
  releaseDate: Date | null;
  year: number | null;
  roles: string[];
  isAdult: boolean;
  externalReviewScore: number | null;
  tgReviewScore: number;
  isTracked: boolean;
}

interface WorkDraft extends Omit<CompanyWork, "tgReviewScore" | "isTracked"> {}

export interface CompanyExternalLink {
  name: string;
  url: string;
}

export interface Company {
  id: number;
  mediaType: CompanyMediaType;
  name: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  originCountry: string | null;
  headquarters: string | null;
  homepage: string | null;
  foundedAt: Date | null;
  alsoKnownAs: string[];
  external: CompanyExternalLink[];
  works: CompanyWork[];
  stats: {
    total: number;
    tracked: number;
  };
}

const IGDB_ROLE_LABELS: Record<string, string> = {
  developer: "Developer",
  publisher: "Publisher",
  porting: "Porting",
  supporting: "Supporting",
};

function averageScore(reviews: { overall: unknown }[]): number {
  if (reviews.length === 0) {
    return 0;
  }

  const total = reviews.reduce((sum, review) => sum + Number(review.overall), 0);

  return parseFloat((total / reviews.length).toFixed(1));
}

/**
 * Integration payloads are cached in Redis, so any `Date` comes back as an ISO string
 * on a cache hit. Coerce before touching date methods.
 */
function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function sortByReleaseDate(works: WorkDraft[]): WorkDraft[] {
  return [...works].sort(
    (a, b) => (b.releaseDate?.getTime() ?? 0) - (a.releaseDate?.getTime() ?? 0) || a.title.localeCompare(b.title),
  );
}

@Injectable()
export class CompanyService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async getMovieCompany(companyId: number): Promise<Company> {
    const [details, media] = await Promise.all([
      this.integrationsService.tmdb.getCompanyById(companyId),
      this.integrationsService.tmdb.getCompanyMedia(companyId, "movie"),
    ]);

    const drafts = sortByReleaseDate(
      media.map((item) => ({
        key: `movie:${item.tmdbId}`,
        id: item.tmdbId,
        title: item.title,
        imageUrl: item.posterUrl,
        backdropUrl: item.backdropUrl,
        releaseDate: toDate(item.releaseDate),
        year: toDate(item.releaseDate)?.getFullYear() ?? null,
        roles: [],
        isAdult: item.isAdult,
        externalReviewScore: item.tmdbReviewScore,
      })),
    );

    const tracked = await this.databaseService.movie.findMany({
      where: { tmdbId: { in: drafts.map((draft) => draft.id) } },
      select: { tmdbId: true, movieReviews: { select: { overall: true } } },
    });

    const works = this.withTrackingData(
      drafts,
      new Map(tracked.map((movie) => [`movie:${movie.tmdbId}`, averageScore(movie.movieReviews)])),
    );

    return this.toResponse("movie", works, {
      id: details.id,
      name: details.name,
      description: details.description,
      logoUrl: details.logoUrl,
      bannerUrl: works.find((work) => work.backdropUrl)?.backdropUrl ?? null,
      originCountry: details.originCountry,
      headquarters: details.headquarters,
      homepage: details.homepage,
      foundedAt: null,
      alsoKnownAs: [],
      external: [],
    });
  }

  async getTVShowCompany(companyId: number): Promise<Company> {
    const [details, media] = await Promise.all([
      this.integrationsService.tmdb.getCompanyById(companyId),
      this.integrationsService.tmdb.getCompanyMedia(companyId, "tv"),
    ]);

    const drafts = sortByReleaseDate(
      media.map((item) => ({
        key: `tv:${item.tmdbId}`,
        id: item.tmdbId,
        title: item.title,
        imageUrl: item.posterUrl,
        backdropUrl: item.backdropUrl,
        releaseDate: toDate(item.releaseDate),
        year: toDate(item.releaseDate)?.getFullYear() ?? null,
        roles: [],
        isAdult: item.isAdult,
        externalReviewScore: item.tmdbReviewScore,
      })),
    );

    const tracked = await this.databaseService.tvShow.findMany({
      where: { tmdbId: { in: drafts.map((draft) => draft.id) } },
      select: { tmdbId: true, tvshowReviews: { select: { overall: true } } },
    });

    const works = this.withTrackingData(
      drafts,
      new Map(tracked.map((tvShow) => [`tv:${tvShow.tmdbId}`, averageScore(tvShow.tvshowReviews)])),
    );

    return this.toResponse("tv", works, {
      id: details.id,
      name: details.name,
      description: details.description,
      logoUrl: details.logoUrl,
      bannerUrl: works.find((work) => work.backdropUrl)?.backdropUrl ?? null,
      originCountry: details.originCountry,
      headquarters: details.headquarters,
      homepage: details.homepage,
      foundedAt: null,
      alsoKnownAs: [],
      external: [],
    });
  }

  async getAnimeCompany(malId: number): Promise<Company> {
    const details = await this.integrationsService.tenrai.getProducerById(malId);

    const drafts = sortByReleaseDate(
      details.animes.map((anime) => ({
        key: `anime:${anime.malId}`,
        id: anime.malId,
        title: anime.title,
        imageUrl: anime.imageUrl,
        backdropUrl: null,
        releaseDate: toDate(anime.airedFrom),
        year: toDate(anime.airedFrom)?.getFullYear() ?? null,
        roles: anime.type ? [anime.type] : [],
        isAdult: anime.isAdult,
        externalReviewScore: anime.malReviewScore,
      })),
    );

    const tracked = await this.databaseService.anime.findMany({
      where: { malId: { in: drafts.map((draft) => draft.id) } },
      select: { malId: true, animeReviews: { select: { overall: true } } },
    });

    const works = this.withTrackingData(
      drafts,
      new Map(tracked.map((anime) => [`anime:${anime.malId}`, averageScore(anime.animeReviews)])),
    );

    return this.toResponse("anime", works, {
      id: details.malId,
      name: details.name,
      description: details.about,
      logoUrl: details.imageUrl,
      bannerUrl: null,
      originCountry: null,
      headquarters: null,
      homepage: details.external.find((link) => link.name.toLowerCase().includes("official"))?.url ?? null,
      foundedAt: toDate(details.established),
      alsoKnownAs: details.alternateNames,
      external: details.url ? [{ name: "MyAnimeList", url: details.url }, ...details.external] : details.external,
    });
  }

  async getGameCompany(companyId: number): Promise<Company> {
    const details = await this.integrationsService.igdb.getCompanyById(companyId);

    const drafts = sortByReleaseDate(
      details.games.map((game) => ({
        key: `game:${game.igdbId}`,
        id: game.igdbId,
        title: game.name,
        imageUrl: game.coverUrl,
        backdropUrl: game.artworkUrl,
        releaseDate: toDate(game.firstReleaseDate),
        year: toDate(game.firstReleaseDate)?.getFullYear() ?? null,
        roles: game.roles.map((role) => IGDB_ROLE_LABELS[role] ?? role),
        isAdult: false,
        externalReviewScore: game.igdbReviewScore ? parseFloat((game.igdbReviewScore / 10).toFixed(1)) : null,
      })),
    );

    const tracked = await this.databaseService.game.findMany({
      where: { igdbId: { in: drafts.map((draft) => draft.id) } },
      select: { igdbId: true, gameReviews: { select: { overall: true } } },
    });

    const works = this.withTrackingData(
      drafts,
      new Map(tracked.map((game) => [`game:${game.igdbId}`, averageScore(game.gameReviews)])),
    );

    return this.toResponse("game", works, {
      id: details.id,
      name: details.name,
      description: details.description,
      logoUrl: details.logoUrl,
      bannerUrl: details.bannerUrl,
      originCountry: null,
      headquarters: null,
      homepage: details.websiteUrl,
      foundedAt: toDate(details.startDate),
      alsoKnownAs: [],
      external: [],
    });
  }

  private withTrackingData(drafts: WorkDraft[], scores: Map<string, number>): CompanyWork[] {
    return drafts.map((draft) => ({
      ...draft,
      tgReviewScore: scores.get(draft.key) ?? 0,
      isTracked: scores.has(draft.key),
    }));
  }

  private toResponse(
    mediaType: CompanyMediaType,
    works: CompanyWork[],
    details: Omit<Company, "mediaType" | "works" | "stats">,
  ): Company {
    if (!details.name) {
      throw new AppException(ERROR_CODES.COMPANY_NOT_FOUND);
    }

    return {
      ...details,
      mediaType,
      works,
      stats: {
        total: works.length,
        tracked: works.filter((work) => work.isTracked).length,
      },
    };
  }
}
