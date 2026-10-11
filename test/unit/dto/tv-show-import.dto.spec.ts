import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateOrUpdateMovieProgressDto } from "@/modules/movie/dto/create-or-update-movie-progress.dto";
import { CreateOrUpdateTVShowEpisodeWatchDto } from "@/modules/tv-show/dto/create-or-update-tv-show-episode-watch.dto";
import { CreateOrUpdateTVShowProgressDto } from "@/modules/tv-show/dto/create-or-update-tv-show-progress.dto";

describe("TV show import DTOs", () => {
  it.each([CreateOrUpdateTVShowProgressDto, CreateOrUpdateMovieProgressDto])(
    "accepts explicit null dates without turning progress into Completed",
    async (dtoClass) => {
      const dto = plainToInstance<
        CreateOrUpdateMovieProgressDto | CreateOrUpdateTVShowProgressDto,
        Record<string, unknown>
      >(dtoClass, {
        tvShowId: "tv",
        movieId: "movie",
        status: "Watching",
        startedAt: null,
        completedAt: null,
      });
      expect(await validate(dto)).toEqual([]);
      expect(dto.status).toBe("Watching");
      expect(dto.startedAt).toBeNull();
      expect(dto.completedAt).toBeNull();
    },
  );
  it("accepts a watched special in season zero", async () => {
    const dto = plainToInstance(CreateOrUpdateTVShowEpisodeWatchDto, {
      tvShowId: "tv",
      episodes: [{ season: 0, episode: 1, status: "Completed" }],
    });
    expect(await validate(dto)).toEqual([]);
  });

  it.each([
    { season: -1, episode: 1 },
    { season: 0, episode: 0 },
  ])("rejects invalid episode numbers %o", async (episode) => {
    const dto = plainToInstance(CreateOrUpdateTVShowEpisodeWatchDto, {
      tvShowId: "tv",
      episodes: [{ ...episode, status: "Completed" }],
    });
    expect(await validate(dto)).not.toEqual([]);
  });

  it("accepts boolean control for automatic episode completion", async () => {
    const dto = plainToInstance(CreateOrUpdateTVShowProgressDto, {
      tvShowId: "tv",
      status: "Completed",
      markAllEpisodes: false,
    });
    expect(await validate(dto)).toEqual([]);
  });

  it("rejects a string pretending to control automatic episode completion", async () => {
    const dto = plainToInstance(CreateOrUpdateTVShowProgressDto, {
      tvShowId: "tv",
      status: "Completed",
      markAllEpisodes: "false",
    });
    expect(await validate(dto)).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: "markAllEpisodes" })]),
    );
  });
});
