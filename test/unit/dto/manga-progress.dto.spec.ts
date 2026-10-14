import { ProgressStatus } from "@prisma/generated/enums";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateOrUpdateMangaProgressDto } from "@/modules/manga/dto/create-or-update-manga-progress.dto";

const input = { mangaId: "manga-1", status: ProgressStatus.Planning };

describe("CreateOrUpdateMangaProgressDto", () => {
  it("accepts unread chapters and zero rereads from a MAL export", async () => {
    const dto = plainToInstance(CreateOrUpdateMangaProgressDto, { ...input, chaptersRead: 0, readCount: 0 });

    expect(await validate(dto)).toEqual([]);
  });

  it.each([ProgressStatus.Reading, ProgressStatus.Completed, ProgressStatus.Dropped, ProgressStatus.Paused])(
    "preserves %s when the export also contains a completion date",
    async (status) => {
      const dto = plainToInstance(CreateOrUpdateMangaProgressDto, {
        ...input,
        status,
        startedAt: "2023-08-12T00:00:00.000Z",
        completedAt: "2023-08-24T00:00:00.000Z",
      });

      expect(await validate(dto)).toEqual([]);
      expect(dto.status).toBe(status);
      expect(dto.startedAt).toEqual(new Date("2023-08-12T00:00:00.000Z"));
      expect(dto.completedAt).toEqual(new Date("2023-08-24T00:00:00.000Z"));
    },
  );

  it.each([-1, 1.5, "1"])("rejects invalid chapter and reread counts (%s)", async (value) => {
    const dto = plainToInstance(CreateOrUpdateMangaProgressDto, { ...input, chaptersRead: value, readCount: value });

    expect(await validate(dto)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: "chaptersRead" }),
        expect.objectContaining({ property: "readCount" }),
      ]),
    );
  });
});
