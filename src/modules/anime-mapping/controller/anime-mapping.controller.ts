import { BadRequestException, Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AnimeMappingService } from "../service/anime-mapping.service";

@ApiTags("Anime")
@Controller("/anime/resolve")
export class AnimeMappingController {
  constructor(private readonly mappings: AnimeMappingService) {}

  @Get("/:type/:tmdbId")
  async resolve(@Param("type") type: string, @Param("tmdbId", ParseIntPipe) tmdbId: number) {
    if ((type !== "movie" && type !== "tv") || tmdbId < 1) throw new BadRequestException("Invalid TMDB media type or ID");
    return { anime: await this.mappings.resolve(type, tmdbId) };
  }
}
