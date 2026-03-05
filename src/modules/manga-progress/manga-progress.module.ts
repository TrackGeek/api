import { Module } from "@nestjs/common";

import { MangaProgressController } from "./manga-progress.controller";
import { MangaProgressService } from "./manga-progress.service";

@Module({
  imports: [],
  controllers: [MangaProgressController],
  providers: [MangaProgressService],
  exports: [MangaProgressService],
})
export class MangaProgressModule {}
