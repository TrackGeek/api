import { Global, Module } from "@nestjs/common";
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
