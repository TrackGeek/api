import { Module } from "@nestjs/common";

import { MangaProgressController } from "./controller/manga-progress.controller";
import { MangaProgressService } from "./service/manga-progress.service";
import { MangaReviewController } from "./controller/manga-review.controller";
import { MangaReviewService } from "./service/manga-review.service";
import { MangaController } from "./controller/manga.controller";
import { MangaService } from "./service/manga.service";

@Module({
  imports: [],
  controllers: [MangaController, MangaReviewController, MangaProgressController],
  providers: [MangaService, MangaReviewService, MangaProgressService],
  exports: [MangaService, MangaReviewService, MangaProgressService],
})
export class MangaModule {}
