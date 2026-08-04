import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "../prisma/generated/client";

// Usage: bun run scripts/backfill-people.tsx
// Seeds the Person table from the cast/crew/characters JSON already stored on
// movies, TV shows and anime, so /cast pages resolve without visiting each title first.
const BATCH_SIZE = 200;
const MAL_PLACEHOLDER_IMAGES = [
  "https://cdn.myanimelist.net/images/questionmark_23.gif",
  "https://myanimelist.net/img/sp/icon/apple-touch-icon-256.png",
];

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface PersonRow {
  name: string;
  imageUrl: string | null;
  tmdbId?: number;
  malId?: number;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePersonName(name: string): string {
  const [family, given] = name.split(",").map((part) => part.trim());

  return given ? `${given} ${family}` : name.trim();
}

function sanitizeMalImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) {
    return null;
  }

  return MAL_PLACEHOLDER_IMAGES.some((placeholder) => imageUrl.startsWith(placeholder)) ? null : imageUrl;
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

async function collectTmdbPeople(): Promise<Map<number, PersonRow>> {
  const people = new Map<number, PersonRow>();

  const add = (entry: any) => {
    if (entry?.id && entry.name && !people.has(entry.id)) {
      people.set(entry.id, { tmdbId: entry.id, name: entry.name, imageUrl: entry.profileUrl ?? null });
    }
  };

  for (let skip = 0; ; skip += BATCH_SIZE) {
    const movies = await prisma.movie.findMany({
      skip,
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
      select: { cast: true, crew: true },
    });

    if (movies.length === 0) {
      break;
    }

    for (const movie of movies) {
      asArray(movie.cast).forEach(add);
      asArray(movie.crew).forEach(add);
    }
  }

  for (let skip = 0; ; skip += BATCH_SIZE) {
    const tvShows = await prisma.tvShow.findMany({
      skip,
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
      select: { cast: true, crew: true, createdBy: true },
    });

    if (tvShows.length === 0) {
      break;
    }

    for (const tvShow of tvShows) {
      asArray(tvShow.cast).forEach(add);
      asArray(tvShow.crew).forEach(add);
      asArray(tvShow.createdBy).forEach(add);
    }
  }

  return people;
}

async function collectMalPeople(): Promise<Map<number, PersonRow>> {
  const people = new Map<number, PersonRow>();

  const add = (entry: any) => {
    if (entry?.malId && entry.name && !people.has(entry.malId)) {
      people.set(entry.malId, {
        malId: entry.malId,
        name: normalizePersonName(entry.name),
        imageUrl: sanitizeMalImageUrl(entry.imageUrl),
      });
    }
  };

  for (let skip = 0; ; skip += BATCH_SIZE) {
    const animes = await prisma.anime.findMany({
      skip,
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
      select: { cast: true, characters: true },
    });

    if (animes.length === 0) {
      break;
    }

    for (const anime of animes) {
      asArray(anime.cast).forEach(add);

      for (const character of asArray(anime.characters)) {
        asArray(character?.voiceActors).forEach(add);
      }
    }
  }

  return people;
}

async function main() {
  const [tmdbPeople, malPeople] = await Promise.all([collectTmdbPeople(), collectMalPeople()]);

  console.log(`Found ${tmdbPeople.size} TMDB people and ${malPeople.size} MyAnimeList people in stored media.`);

  const [existingTmdb, existingMal] = await Promise.all([
    prisma.person.findMany({ where: { tmdbId: { not: null } }, select: { tmdbId: true } }),
    prisma.person.findMany({ where: { malId: { not: null } }, select: { malId: true } }),
  ]);

  for (const { tmdbId } of existingTmdb) {
    if (tmdbId !== null) {
      tmdbPeople.delete(tmdbId);
    }
  }

  for (const { malId } of existingMal) {
    if (malId !== null) {
      malPeople.delete(malId);
    }
  }

  const pending = [...tmdbPeople.values(), ...malPeople.values()];

  if (pending.length === 0) {
    console.log("Nothing to backfill — every person is already tracked.");

    return;
  }

  const takenSlugs = new Set((await prisma.person.findMany({ select: { slug: true } })).map((person) => person.slug));

  const rows = pending.map((person) => {
    const base = slugify(person.name) || "person";
    let slug = base;
    let suffix = 2;

    while (takenSlugs.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix++;
    }

    takenSlugs.add(slug);

    return { ...person, slug };
  });

  const { count } = await prisma.person.createMany({ data: rows, skipDuplicates: true });

  console.log(`Created ${count} people.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
