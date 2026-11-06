import { Injectable } from "@nestjs/common";

import { AnilistService } from "./anilist.service";
import { HardcoverService } from "./hardcover.service";
import { IGDBService } from "./igdb.service";
import { IMGBBService } from "./imgbb.service";
import { PSNService } from "./psn.service";
import { R2Service } from "./r2.service";
import { TenraiService } from "./tenrai.service";
import { TMDBService } from "./tmdb.service";

@Injectable()
export class IntegrationsService {
  constructor(
    readonly anilist: AnilistService,
    readonly hardcover: HardcoverService,
    readonly igdb: IGDBService,
    readonly imgbb: IMGBBService,
    readonly psn: PSNService,
    readonly r2: R2Service,
    readonly tenrai: TenraiService,
    readonly tmdb: TMDBService,
  ) {}
}
