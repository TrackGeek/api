import { Injectable } from "@nestjs/common";
import type { Person } from "@prisma/generated/client";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import type { TenraiPersonDetails } from "@/shared/infra/integrations/tenrai.service";
import type { TMDBPersonCredit, TMDBPersonDetails } from "@/shared/infra/integrations/tmdb.service";
import { normalizePersonName } from "./person-sync.service";

export type PersonCreditMediaType = "movie" | "tv" | "anime";

export interface PersonCredit {
  key: string;
  mediaType: PersonCreditMediaType;
  id: number;
  title: string;
  imageUrl: string | null;
  backdropUrl: string | null;
  releaseDate: Date | null;
  year: number | null;
  roles: string[];
  isCast: boolean;
  isAdult: boolean;
  episodeCount: number | null;
  externalReviewScore: number | null;
  popularity: number | null;
  tgReviewScore: number;
  isTracked: boolean;
}

interface CreditDraft extends Omit<PersonCredit, "tgReviewScore" | "isTracked"> {}

function averageScore(reviews: { overall: unknown }[]): number {
  if (reviews.length === 0) {
    return 0;
  }

  const total = reviews.reduce((sum, review) => sum + Number(review.overall), 0);

  return parseFloat((total / reviews.length).toFixed(1));
}

/**
 * Integration payloads are cached in Redis, so any `Date` comes back as an ISO string
 * on a cache hit. Coerce before touching date methods or handing values to Prisma.
 */
function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function yearOf(value: Date | string | null | undefined): number | null {
  return toDate(value)?.getFullYear() ?? null;
}

@Injectable()
export class PersonService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async getPersonBySlug(slug: string) {
    const person = await this.databaseService.person.findUnique({ where: { slug } });

    if (!person) {
      throw new AppException(ERROR_CODES.PERSON_NOT_FOUND);
    }

    if (person.tmdbId !== null) {
      return this.hydrateFromTmdb(person, person.tmdbId);
    }

    if (person.malId !== null) {
      return this.hydrateFromMal(person, person.malId);
    }

    throw new AppException(ERROR_CODES.PERSON_NOT_FOUND);
  }

  private async hydrateFromTmdb(person: Person, tmdbId: number) {
    const details = await this.integrationsService.tmdb.getPersonById(tmdbId);
    const drafts = this.toTmdbCreditDrafts(details);
    const credits = await this.withTrackingData(drafts);

    const updated = await this.databaseService.person.update({
      where: { id: person.id },
      data: {
        name: details.name,
        imageUrl: details.imageUrl ?? person.imageUrl,
        biography: details.biography,
        birthday: toDate(details.birthday),
        deathday: toDate(details.deathday),
        placeOfBirth: details.placeOfBirth,
        knownForDepartment: details.knownForDepartment,
        alsoKnownAs: details.alsoKnownAs,
        gender: details.gender,
        homepage: details.homepage,
        popularity: details.popularity,
        images: details.images,
        external: details.external,
        lastRefreshedAt: new Date(),
      },
    });

    return this.toResponse(updated, "tmdb", credits);
  }

  private async hydrateFromMal(person: Person, malId: number) {
    const details = await this.integrationsService.tenrai.getPersonById(malId);
    const drafts = this.toMalCreditDrafts(details);
    const credits = await this.withTrackingData(drafts);

    const updated = await this.databaseService.person.update({
      where: { id: person.id },
      data: {
        name: normalizePersonName(details.name),
        imageUrl: details.imageUrl ?? person.imageUrl,
        biography: details.about,
        birthday: toDate(details.birthday),
        alsoKnownAs: details.alternateNames,
        homepage: details.websiteUrl,
        popularity: details.favorites,
        external: { mal: details.url },
        lastRefreshedAt: new Date(),
      },
    });

    return this.toResponse(updated, "mal", credits);
  }

  private toTmdbCreditDrafts(details: TMDBPersonDetails): CreditDraft[] {
    const byKey = new Map<string, CreditDraft>();

    const add = (credit: TMDBPersonCredit, role: string | null, isCast: boolean) => {
      const key = `${credit.mediaType}:${credit.tmdbId}`;
      const existing = byKey.get(key);

      if (existing) {
        if (role && !existing.roles.includes(role)) {
          existing.roles.push(role);
        }

        existing.isCast = existing.isCast || isCast;

        return;
      }

      byKey.set(key, {
        key,
        mediaType: credit.mediaType,
        id: credit.tmdbId,
        title: credit.title,
        imageUrl: credit.posterUrl,
        backdropUrl: credit.backdropUrl,
        releaseDate: toDate(credit.releaseDate),
        year: yearOf(credit.releaseDate),
        roles: role ? [role] : [],
        isCast,
        isAdult: credit.isAdult,
        episodeCount: credit.episodeCount,
        externalReviewScore: credit.tmdbReviewScore,
        popularity: credit.popularity,
      });
    };

    for (const credit of details.cast) {
      add(credit, credit.character, true);
    }

    for (const credit of details.crew) {
      add(credit, credit.job, false);
    }

    return [...byKey.values()];
  }

  private toMalCreditDrafts(details: TenraiPersonDetails): CreditDraft[] {
    const byKey = new Map<string, CreditDraft>();

    const upsert = (
      anime: { malId: number; title: string; imageUrl: string | null },
      role: string,
      isCast: boolean,
    ) => {
      const key = `anime:${anime.malId}`;
      const existing = byKey.get(key);

      if (existing) {
        if (!existing.roles.includes(role)) {
          existing.roles.push(role);
        }

        existing.isCast = existing.isCast || isCast;

        return;
      }

      byKey.set(key, {
        key,
        mediaType: "anime",
        id: anime.malId,
        title: anime.title,
        imageUrl: anime.imageUrl,
        backdropUrl: null,
        releaseDate: null,
        year: null,
        roles: [role],
        isCast,
        isAdult: false,
        episodeCount: null,
        externalReviewScore: null,
        popularity: null,
      });
    };

    for (const voice of details.voices) {
      upsert(voice.anime, voice.character.name, true);
    }

    for (const staff of details.animeStaff) {
      upsert({ malId: staff.malId, title: staff.title, imageUrl: staff.imageUrl }, staff.position, false);
    }

    return [...byKey.values()];
  }

  private async withTrackingData(drafts: CreditDraft[]): Promise<PersonCredit[]> {
    const idsOf = (mediaType: PersonCreditMediaType) =>
      drafts.filter((draft) => draft.mediaType === mediaType).map((draft) => draft.id);

    const [movies, tvShows, animes] = await Promise.all([
      this.databaseService.movie.findMany({
        where: { tmdbId: { in: idsOf("movie") } },
        select: { tmdbId: true, movieReviews: { select: { overall: true } } },
      }),
      this.databaseService.tvShow.findMany({
        where: { tmdbId: { in: idsOf("tv") } },
        select: { tmdbId: true, tvshowReviews: { select: { overall: true } } },
      }),
      this.databaseService.anime.findMany({
        where: { malId: { in: idsOf("anime") } },
        select: { malId: true, animeReviews: { select: { overall: true } } },
      }),
    ]);

    const scores = new Map<string, number>();

    for (const movie of movies) {
      scores.set(`movie:${movie.tmdbId}`, averageScore(movie.movieReviews));
    }

    for (const tvShow of tvShows) {
      scores.set(`tv:${tvShow.tmdbId}`, averageScore(tvShow.tvshowReviews));
    }

    for (const anime of animes) {
      scores.set(`anime:${anime.malId}`, averageScore(anime.animeReviews));
    }

    return drafts
      .map((draft) => ({
        ...draft,
        tgReviewScore: scores.get(draft.key) ?? 0,
        isTracked: scores.has(draft.key),
      }))
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title));
  }

  private toResponse(person: Person, source: "tmdb" | "mal", credits: PersonCredit[]) {
    const countOf = (mediaType: PersonCreditMediaType) =>
      credits.filter((credit) => credit.mediaType === mediaType).length;

    return {
      ...person,
      source,
      credits,
      stats: {
        total: credits.length,
        movies: countOf("movie"),
        tvShows: countOf("tv"),
        anime: countOf("anime"),
        tracked: credits.filter((credit) => credit.isTracked).length,
      },
    };
  }
}
