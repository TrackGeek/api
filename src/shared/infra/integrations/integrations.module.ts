import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { TMDBLocalizationInterceptor } from "@/shared/media-localization/tmdb-localization.interceptor";
import { AnilistService } from "./anilist.service";
import { HardcoverService } from "./hardcover.service";
import { IGDBService } from "./igdb.service";
import { IMGBBService } from "./imgbb.service";
import { IntegrationsService } from "./integrations.service";
import { TenraiService } from "./tenrai.service";
import { TMDBService } from "./tmdb.service";

@Global()
@Module({
  imports: [],
  providers: [
    AnilistService,
    HardcoverService,
    IGDBService,
    IMGBBService,
    TenraiService,
    TMDBService,
    IntegrationsService,
    { provide: APP_INTERCEPTOR, useClass: TMDBLocalizationInterceptor },
  ],
  exports: [
    AnilistService,
    HardcoverService,
    IGDBService,
    IMGBBService,
    TenraiService,
    TMDBService,
    IntegrationsService,
  ],
})
export class IntegrationsModule {}
