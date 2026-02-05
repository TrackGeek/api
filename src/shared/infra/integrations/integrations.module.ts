import { Global, Module } from "@nestjs/common";
import { HardcoverService } from './hardcover.service';
import { IGDBService } from './igdb.service';
import { IMGBBService } from './imgbb.service';
import { JikanService } from './jikan.service';
import { TMDBService } from './tmdb.service';
import { IntegrationsService } from './integrations.service';

@Global()
@Module({
  imports: [],
  providers: [HardcoverService, IGDBService, IMGBBService, JikanService, TMDBService, IntegrationsService],
  exports: [HardcoverService, IGDBService, IMGBBService, JikanService, TMDBService, IntegrationsService],
})
export class IntegrationsModule {}
