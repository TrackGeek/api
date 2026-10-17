import { Module } from "@nestjs/common";
import { AnimeModule } from "@/modules/anime/anime.module";
import { BookModule } from "@/modules/book/book.module";
import { CatchupModule } from "@/modules/catchup/catchup.module";
import { GameModule } from "@/modules/game/game.module";
import { MangaModule } from "@/modules/manga/manga.module";
import { MovieModule } from "@/modules/movie/movie.module";
import { OAuthModule } from "@/modules/oauth/oauth.module";
import { TVShowModule } from "@/modules/tv-show/tv-show.module";
import { IntegrationController } from "./controller/integration.controller";
import { IntegrationExceptionFilter } from "./filters/integration-exception.filter";
import { IntegrationGuard } from "./guards/integration.guard";
import { IntegrationOperationsService } from "./service/integration-operations.service";
import { IntegrationRateLimitService } from "./service/integration-rate-limit.service";
import { TrackingCatalogService } from "./service/tracking-catalog.service";
import { TrackingLibraryService } from "./service/tracking-library.service";
import { TrackingProgressService } from "./service/tracking-progress.service";

@Module({
  imports: [OAuthModule, AnimeModule, MangaModule, TVShowModule, MovieModule, GameModule, BookModule, CatchupModule],
  controllers: [IntegrationController],
  providers: [
    IntegrationGuard,
    IntegrationExceptionFilter,
    IntegrationOperationsService,
    IntegrationRateLimitService,
    TrackingCatalogService,
    TrackingLibraryService,
    TrackingProgressService,
  ],
  exports: [OAuthModule, IntegrationGuard, IntegrationExceptionFilter, IntegrationOperationsService],
})
export class TrackingIntegrationsModule {}
