import { ProgressStatus } from "@prisma/generated/enums";
import type { AnilistEntry } from "./anilist-snapshot.service";

export type AnilistMediaType = "ANIME" | "MANGA";

export interface FuzzyDate {
  year?: number | null;
  month?: number | null;
  day?: number | null;
}

export interface AnilistMappedEntry {
  mediaId: number;
  externalId: number;
  type: AnilistMediaType;
  name: string;
  status: ProgressStatus;
  progress: number;
  repeat: number;
  startedAt?: Date;
  completedAt?: Date;
  lists: string[];
  notes?: string;
  warnings: string[];
  review: Partial<Record<"overall" | "story" | "characters" | "animation" | "sound" | "enjoyment" | "art", number>>;
}

export type AnilistMappingResult =
  | { state: "ready"; entry: AnilistMappedEntry }
  | { state: "skipped"; mediaId: number; name: string; reason: "missingMalId" | "unsupportedStatus" | "invalidEntry" };

export function mapAnilistDate(value: FuzzyDate | null | undefined) {
  if (!value?.year) return { date: undefined, partial: false };

  const month = value.month ?? 1;
  const day = value.day ?? 1;
  const date = new Date(0);
  date.setUTCFullYear(value.year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);

  if (date.getUTCFullYear() !== value.year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { date: undefined, partial: false };
  }

  return { date, partial: !value.month || !value.day };
}

export function mapAnilistStatus(status: unknown, type: AnilistMediaType): ProgressStatus | undefined {
  if (typeof status !== "string") return undefined;

  const statuses: Record<string, ProgressStatus> = {
    CURRENT: type === "ANIME" ? ProgressStatus.Watching : ProgressStatus.Reading,
    WATCHING: ProgressStatus.Watching,
    READING: ProgressStatus.Reading,
    REPEATING: type === "ANIME" ? ProgressStatus.Rewatching : ProgressStatus.Rereading,
    COMPLETED: ProgressStatus.Completed,
    FINISHED: ProgressStatus.Completed,
    PLANNING: ProgressStatus.Planning,
    DROPPED: ProgressStatus.Dropped,
    PAUSED: ProgressStatus.Paused,
  };

  return statuses[status];
}

export function mapAnilistScore(score: unknown, format: string): number | undefined {
  if (typeof score !== "number" || !Number.isFinite(score) || score <= 0) return undefined;
  const maxima: Record<string, number> = { POINT_3: 3, POINT_5: 5, POINT_100: 100, POINT_10_DECIMAL: 10, POINT_10: 10 };
  if (!maxima[format] || score > maxima[format]) return undefined;
  if (format === "POINT_3") return ({ 1: 1, 2: 5, 3: 10 } as Record<number, number>)[score] / 2 || undefined;
  if (format === "POINT_5") return score;
  if (format === "POINT_100") return Math.round(score / 10) / 2;
  if (format === "POINT_10_DECIMAL") return Math.round(score) / 2;
  return score / 2;
}

export function mapAnilistEntry(raw: AnilistEntry, scoreFormat = "POINT_100"): AnilistMappingResult {
  const title = raw.media?.title as { english?: string; romaji?: string; native?: string } | undefined;
  const name = title?.english || title?.romaji || title?.native || String(raw.mediaId);
  const type = raw.media?.type;
  const skipped = (reason: "missingMalId" | "unsupportedStatus" | "invalidEntry"): AnilistMappingResult => ({
    state: "skipped",
    mediaId: raw.mediaId,
    name,
    reason,
  });

  if (type !== "ANIME" && type !== "MANGA") return skipped("invalidEntry");

  const externalId = type === "ANIME" ? raw.media.idMal : raw.media.id;
  if (!Number.isInteger(externalId) || Number(externalId) <= 0) {
    return skipped(type === "ANIME" ? "missingMalId" : "invalidEntry");
  }

  const status = mapAnilistStatus(raw.status, type);
  if (!status) return skipped("unsupportedStatus");
  if (![raw.progress, raw.repeat].every((value) => Number.isInteger(value) && Number(value) >= 0)) {
    return skipped("invalidEntry");
  }

  const started = mapAnilistDate(raw.startedAt as FuzzyDate | null);
  const completed = mapAnilistDate(raw.completedAt as FuzzyDate | null);
  const lists = Object.entries((raw.customLists ?? {}) as Record<string, unknown>)
    .filter(([name, enabled]) => name.trim() && enabled === true)
    .map(([name]) => name);
  const warnings = [started.partial && "partialStartedAt", completed.partial && "partialCompletedAt"].filter(
    (warning): warning is string => Boolean(warning),
  );
  const review: AnilistMappedEntry["review"] = {};
  const overall = mapAnilistScore(raw.score, scoreFormat);
  if (overall !== undefined) review.overall = overall;
  const categories = {
    story: "story",
    characters: "characters",
    visuals: "animation",
    animation: "animation",
    audio: "sound",
    sound: "sound",
    enjoyment: "enjoyment",
  } as const;
  const preserved: string[] = [];
  for (const [name, score] of Object.entries((raw.advancedScores ?? {}) as Record<string, unknown>)) {
    const rating = mapAnilistScore(score, scoreFormat);
    if (rating === undefined) {
      if (typeof score === "number" && score > 0) warnings.push(`invalidAdvancedScore:${name}`);
      continue;
    }
    const category = categories[name.toLowerCase().trim() as keyof typeof categories];
    if (type === "ANIME" && category) review[category] = rating;
    else if (type === "MANGA" && category === "animation") review.art = rating;
    else preserved.push(`${name}: ${rating}`);
  }
  const notes =
    [
      typeof raw.notes === "string" ? raw.notes : "",
      preserved.length ? `AniList advanced scores (0–5):\n${preserved.join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n") || undefined;

  return {
    state: "ready",
    entry: {
      mediaId: raw.mediaId,
      externalId: Number(externalId),
      type,
      name,
      status,
      progress: Number(raw.progress),
      repeat: Number(raw.repeat),
      startedAt: started.date,
      completedAt: completed.date,
      lists,
      notes,
      warnings,
      review,
    },
  };
}
