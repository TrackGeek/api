import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { TMDBLocalizationInterceptor } from "@/shared/media-localization/tmdb-localization.interceptor";
import { AnilistService } from "./anilist.service";
import { HardcoverService } from "./hardcover.service";
import { HowLongToBeatService } from "./how-long-to-beat.service";
import { IGDBService } from "./igdb.service";
import { IMGBBService } from "./imgbb.service";
import { IntegrationsService } from "./integrations.service";
import { ProtonDbService } from "./protondb.service";
import { PSNService } from "./psn.service";
import { R2Service } from "./r2.service";
import { TenraiService } from "./tenrai.service";
import { TMDBService } from "./tmdb.service";

@Global()
@Module({
  imports: [],
  providers: [
    AnilistService,
    HardcoverService,
    HowLongToBeatService,
    IGDBService,
    IMGBBService,
    PSNService,
    ProtonDbService,
    R2Service,
    TenraiService,
    TMDBService,
    IntegrationsService,
    { provide: APP_INTERCEPTOR, useClass: TMDBLocalizationInterceptor },
  ],
  exports: [
    AnilistService,
    HardcoverService,
    HowLongToBeatService,
    IGDBService,
    IMGBBService,
    PSNService,
    ProtonDbService,
    R2Service,
    TenraiService,
    TMDBService,
    IntegrationsService,
  ],
})
export class IntegrationsModule {}
