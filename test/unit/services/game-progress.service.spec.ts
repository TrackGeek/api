import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it, vi } from "vitest";
import { GetGameProgressDto } from "@/modules/game/dto/get-game-progress.dto";
import { GameProgressService } from "@/modules/game/service/game-progress.service";

function setup() {
  const database = {
    offsetPagination: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    gameProgress: { findMany: vi.fn().mockResolvedValue([]) },
  };
  const filters = {
    countProgressByStatus: vi.fn().mockResolvedValue({}),
    getFilterOptions: vi.fn().mockResolvedValue({ genres: [], years: [], releaseStates: [] }),
  };
  const service = new GameProgressService(database as any, {} as any, filters as any, {} as any);
  return { database, filters, service };
}

describe("GameProgressService", () => {
  it("combines completion, played and available platforms before pagination and status counts", async () => {
    const { database, filters, service } = setup();
    await service.getGameProgress(
      plainToInstance(GetGameProgressDto, {
        userId: "user",
        status: "Dropped",
        completion: "mainStory,100%",
        selectedPlatforms: "win",
        availablePlatforms: "win,linux",
        search: "Portal",
        page: 2,
      }),
    );
    const request = database.offsetPagination.mock.calls[0][0];
    expect(request.page).toBe(2);
    expect(request.where).toMatchObject({
      userId: "user",
      status: "Dropped",
      completion: { in: ["mainStory", "100%"] },
      platforms: { hasSome: ["win"] },
      game: {
        AND: [
          { AND: [{ name: { contains: "Portal", mode: "insensitive" } }] },
          {
            OR: [
              { platforms: { array_contains: [{ slug: "win" }] } },
              { platforms: { array_contains: [{ slug: "linux" }] } },
            ],
          },
        ],
      },
    });
    const { status, ...where } = request.where;
    expect(status).toBe("Dropped");
    expect(filters.countProgressByStatus).toHaveBeenCalledWith("gameProgress", where);
  });

  it("deduplicates platform options and keeps selected platform labels when metadata is missing", async () => {
    const { database, service } = setup();
    database.gameProgress.findMany.mockResolvedValue([
      {
        platforms: ["win", "legacy"],
        game: {
          platforms: [
            { slug: "win", name: "Windows" },
            { slug: "linux", name: "Linux" },
          ],
        },
      },
      { platforms: ["win"], game: { platforms: [{ slug: "win", name: "Windows" }, null, { name: "Invalid" }] } },
      { platforms: [], game: { platforms: null } },
    ]);
    const result = await service.getGameProgressFilters("user");
    expect(result.availablePlatforms).toEqual([
      { slug: "linux", name: "Linux" },
      { slug: "win", name: "Windows" },
    ]);
    expect(result.selectedPlatforms).toEqual([
      { slug: "legacy", name: "legacy" },
      { slug: "win", name: "Windows" },
    ]);
    expect(database.gameProgress.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user" } }));
  });

  it("validates completion values and rejects non-string platform filters", async () => {
    const valid = plainToInstance(GetGameProgressDto, { completion: "mainStory,100%", selectedPlatforms: "win,linux" });
    expect(await validate(valid)).toEqual([]);
    const invalid = plainToInstance(GetGameProgressDto, { completion: "invalid", availablePlatforms: [42] });
    expect((await validate(invalid)).map((error) => error.property)).toEqual(
      expect.arrayContaining(["completion", "availablePlatforms"]),
    );
  });
});
