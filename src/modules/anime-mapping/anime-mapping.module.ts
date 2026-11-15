import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AnimeCanonicalInterceptor } from "./anime-canonical.interceptor";
import { AnimeModule } from "@/modules/anime/anime.module";
import { AnimeMappingController } from "./controller/anime-mapping.controller";
import { AnimeMappingService } from "./service/anime-mapping.service";
import { AnimeMigrationService } from "./service/anime-migration.service";

@Global()
@Module({
  imports: [AnimeModule],
  controllers: [AnimeMappingController],
  providers: [AnimeMappingService, AnimeMigrationService, { provide: APP_INTERCEPTOR, useClass: AnimeCanonicalInterceptor }],
  exports: [AnimeMappingService],
})
export class AnimeMappingModule {}
