import { Module } from "@nestjs/common";
import { MangaController } from "./controller/manga.controller";
import { MangaProgressController } from "./controller/manga-progress.controller";
import { MangaReviewController } from "./controller/manga-review.controller";
import { MangaService } from "./service/manga.service";
import { MangaProgressService } from "./service/manga-progress.service";
import { MangaReviewService } from "./service/manga-review.service";

@Module({
  imports: [],
  controllers: [MangaController, MangaReviewController, MangaProgressController],
  providers: [MangaService, MangaReviewService, MangaProgressService],
  exports: [MangaService, MangaReviewService, MangaProgressService],
})
export class MangaModule {}
