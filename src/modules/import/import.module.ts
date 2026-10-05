import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AnimeModule } from "@/modules/anime/anime.module";
import { ListModule } from "@/modules/list/list.module";
import { MangaModule } from "@/modules/manga/manga.module";
import { AnilistImportProcessor } from "./anilist-import.processor";
import { ANILIST_IMPORT_QUEUE, AnilistJobService } from "./anilist-job.service";
import { AnilistSnapshotService } from "./anilist-snapshot.service";
import { ImportController } from "./import.controller";

@Module({
  imports: [AnimeModule, MangaModule, ListModule, BullModule.registerQueue({ name: ANILIST_IMPORT_QUEUE })],
  controllers: [ImportController],
  providers: [AnilistSnapshotService, AnilistJobService, AnilistImportProcessor],
})
export class ImportModule {}
