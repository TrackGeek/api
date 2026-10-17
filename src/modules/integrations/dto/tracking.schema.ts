import { ProgressStatus, WatchEpisodeStatus } from "@prisma/generated/enums";
import { z } from "zod";
import { MEDIA_TYPES } from "@/shared/media-filter/media-filter.constants";

const mediaType = z.enum(MEDIA_TYPES);
const mediaId = z.uuid();
const count = z.number().int().min(0).max(2147483647);
const timestamp = z.iso.datetime({ offset: true });

export const searchMediaSchema = z.strictObject({
  type: mediaType,
  query: z.string().trim().min(1).max(200),
  page: z.coerce.number().int().min(1).max(100).default(1),
});

export const mediaDetailsSchema = z.strictObject({
  type: mediaType,
  externalId: z.coerce.number().int().positive().max(2147483647),
});

export const mediaProgressSchema = z.strictObject({
  type: mediaType,
  id: mediaId,
  episodePage: z.coerce.number().int().min(1).max(1000).default(1),
});

export const librarySchema = z.strictObject({
  type: mediaType,
  status: z.enum(ProgressStatus).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(25).default(20),
});

export const mediaStatusSchema = z.strictObject({
  type: mediaType,
  id: mediaId,
  status: z.enum(ProgressStatus),
  startedAt: timestamp.optional(),
  completedAt: timestamp.optional(),
  markAllEpisodes: z.boolean().default(false),
});

export const bookProgressSchema = z.strictObject({
  id: mediaId,
  pagesRead: count,
  totalPages: count.min(1).optional(),
});

export const mangaProgressSchema = z.strictObject({ id: mediaId, chaptersRead: count });

export const gameProgressSchema = z
  .strictObject({
    id: mediaId,
    hoursPlayed: count.optional(),
    platforms: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(100)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      )
      .max(50)
      .transform((items) => [...new Set(items)].sort())
      .optional(),
    completion: z.enum(["mainStory", "mainStoryPlusExtras", "100%", "endless"]).optional(),
  })
  .refine(
    (input) => input.hoursPlayed !== undefined || input.platforms !== undefined || input.completion !== undefined,
    {
      message: "Provide hoursPlayed, platforms or completion.",
    },
  );

export const episodeStatusSchema = z
  .strictObject({
    type: z.enum(["anime", "tv"]),
    id: mediaId,
    season: z.number().int().min(0).max(1000).optional(),
    episode: z.number().int().min(1).max(100000),
    status: z.enum(WatchEpisodeStatus),
  })
  .superRefine((input, context) => {
    if (input.type === "tv" && input.season === undefined) {
      context.addIssue({ code: "custom", path: ["season"], message: "Season is required for TV episodes." });
    }
    if (input.type === "anime" && input.season !== undefined) {
      context.addIssue({ code: "custom", path: ["season"], message: "Anime episodes do not use seasons." });
    }
  });

export const episodesSchema = z.strictObject({
  type: z.enum(["anime", "tv"]),
  externalId: z.coerce.number().int().positive().max(2147483647),
  season: z.coerce.number().int().min(0).max(1000).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});

export const catchupSchema = z.strictObject({
  days: z.coerce.number().int().min(1).max(30).default(7),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(25).default(20),
});
