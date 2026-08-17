import { Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { sanitizeMalImageUrl } from "@/shared/infra/integrations/tenrai.service";
import { slugify } from "@/shared/utils/string";

export interface TmdbPersonSeed {
  id: number;
  name: string;
  profileUrl?: string | null;
}

export interface MalPersonSeed {
  malId: number;
  name: string;
  imageUrl?: string | null;
}

export interface AnilistPersonSeed {
  anilistId: number;
  name: string;
  imageUrl?: string | null;
}

const UNIQUE_CONSTRAINT_ERROR = "P2002";

export function normalizePersonName(name: string): string {
  const [family, given] = name.split(",").map((part) => part.trim());

  return given ? `${given} ${family}` : name.trim();
}

@Injectable()
export class PersonSyncService {
  private readonly logger = new Logger(PersonSyncService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Resolves TMDB people to their `/cast` slugs, creating any that are not tracked yet.
   * Returns a `tmdbId -> slug` map so callers can make cast and crew entries linkable.
   */
  async resolveTmdbPeople(seeds: TmdbPersonSeed[]): Promise<Map<number, string>> {
    const pending = new Map<number, TmdbPersonSeed>();

    for (const seed of seeds) {
      if (seed?.id && seed.name && !pending.has(seed.id)) {
        pending.set(seed.id, seed);
      }
    }

    if (pending.size === 0) {
      return new Map();
    }

    const existing = await this.databaseService.person.findMany({
      where: { tmdbId: { in: [...pending.keys()] } },
      select: { tmdbId: true, slug: true },
    });

    const slugs = new Map<number, string>();

    for (const person of existing) {
      if (person.tmdbId !== null) {
        slugs.set(person.tmdbId, person.slug);
        pending.delete(person.tmdbId);
      }
    }

    for (const seed of pending.values()) {
      const created = await this.createPerson({
        tmdbId: seed.id,
        name: seed.name,
        imageUrl: seed.profileUrl ?? null,
      });

      if (created) {
        slugs.set(seed.id, created.slug);
      }
    }

    return slugs;
  }

  /**
   * Resolves MyAnimeList people (anime staff and voice actors) to their `/cast` slugs,
   * creating any that are not tracked yet. Returns a `malId -> slug` map.
   */
  async resolveMalPeople(seeds: MalPersonSeed[]): Promise<Map<number, string>> {
    const pending = new Map<number, MalPersonSeed>();

    for (const seed of seeds) {
      if (seed?.malId && seed.name && !pending.has(seed.malId)) {
        pending.set(seed.malId, seed);
      }
    }

    if (pending.size === 0) {
      return new Map();
    }

    const existing = await this.databaseService.person.findMany({
      where: { malId: { in: [...pending.keys()] } },
      select: { malId: true, slug: true },
    });

    const slugs = new Map<number, string>();

    for (const person of existing) {
      if (person.malId !== null) {
        slugs.set(person.malId, person.slug);
        pending.delete(person.malId);
      }
    }

    for (const seed of pending.values()) {
      const created = await this.createPerson({
        malId: seed.malId,
        name: normalizePersonName(seed.name),
        imageUrl: sanitizeMalImageUrl(seed.imageUrl),
      });

      if (created) {
        slugs.set(seed.malId, created.slug);
      }
    }

    return slugs;
  }

  /**
   * Resolves an AniList staff member to its tracked `Person` row, creating it when
   * missing. AniList staff is otherwise only fetched live, so this is what makes a
   * manga cast member favouritable.
   */
  async resolveAnilistPerson(seed: AnilistPersonSeed) {
    const existing = await this.databaseService.person.findUnique({
      where: { anilistId: seed.anilistId },
    });

    if (existing) {
      return existing;
    }

    return this.createPerson({
      anilistId: seed.anilistId,
      name: seed.name,
      imageUrl: seed.imageUrl ?? null,
    });
  }

  /**
   * Stamps a `/cast` slug onto every TMDB cast and crew entry of a movie or TV show,
   * so the UI can turn each credit into a link.
   */
  async linkTmdbCredits<T extends TmdbPersonSeed>(groups: Record<string, T[] | null | undefined>) {
    const seeds = Object.values(groups).flatMap((group) => group ?? []);
    const slugs = await this.resolveTmdbPeople(seeds);

    return Object.fromEntries(
      Object.entries(groups).map(([name, group]) => [
        name,
        (group ?? []).map((entry) => ({ ...entry, slug: slugs.get(entry.id) ?? null })),
      ]),
    ) as { [K in keyof typeof groups]: (T & { slug: string | null })[] };
  }

  /**
   * Stamps a `/cast` slug onto anime staff entries and onto the voice actors nested
   * inside each character, so both become linkable.
   */
  async linkAnimeCredits<S extends MalPersonSeed, V extends MalPersonSeed, C extends { voiceActors?: V[] | null }>(
    staff: S[] | null | undefined,
    characters: C[] | null | undefined,
  ) {
    const voiceActors = (characters ?? []).flatMap((character) => character.voiceActors ?? []);
    const slugs = await this.resolveMalPeople([...(staff ?? []), ...voiceActors]);

    return {
      cast: (staff ?? []).map((entry) => ({ ...entry, slug: slugs.get(entry.malId) ?? null })),
      characters: (characters ?? []).map((character) => ({
        ...character,
        voiceActors: (character.voiceActors ?? []).map((actor) => ({
          ...actor,
          slug: slugs.get(actor.malId) ?? null,
        })),
      })),
    };
  }

  private async createPerson(data: {
    name: string;
    tmdbId?: number;
    malId?: number;
    anilistId?: number;
    imageUrl: string | null;
  }) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await this.databaseService.person.create({
          data: { ...data, slug: await this.allocateSlug(data.name) },
        });
      } catch (error: any) {
        if (error?.code !== UNIQUE_CONSTRAINT_ERROR) {
          this.logger.warn(`Failed to create person "${data.name}": ${error?.message}`);

          return null;
        }

        const target = error?.meta?.target;
        const isSlugCollision = Array.isArray(target) ? target.includes("slug") : target === "slug";

        if (!isSlugCollision) {
          // Another request created this same person concurrently.
          const where = data.tmdbId
            ? { tmdbId: data.tmdbId }
            : data.malId
              ? { malId: data.malId }
              : { anilistId: data.anilistId };

          return this.databaseService.person.findFirst({ where });
        }
      }
    }

    this.logger.warn(`Gave up allocating a slug for person "${data.name}"`);

    return null;
  }

  private async allocateSlug(name: string): Promise<string> {
    const base = slugify(name) || "person";

    const taken = new Set(
      (
        await this.databaseService.person.findMany({
          where: { OR: [{ slug: base }, { slug: { startsWith: `${base}-` } }] },
          select: { slug: true },
        })
      ).map((person) => person.slug),
    );

    if (!taken.has(base)) {
      return base;
    }

    let suffix = 2;

    while (taken.has(`${base}-${suffix}`)) {
      suffix++;
    }

    return `${base}-${suffix}`;
  }
}
