import { Injectable } from "@nestjs/common";

import { HardcoverService } from "./hardcover.service";
import { IGDBService } from "./igdb.service";
import { IMGBBService } from "./imgbb.service";
import { JikanService } from "./jikan.service";
import { TMDBService } from "./tmdb.service";

@Injectable()
export class IntegrationsService {
  constructor(
    readonly hardcover: HardcoverService,
    readonly igdb: IGDBService,
    readonly imgbb: IMGBBService,
    readonly jikan: JikanService,
    readonly tmdb: TMDBService,
  ) {}
}
