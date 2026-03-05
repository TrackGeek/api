import { Module } from "@nestjs/common";

import { BookProgressController } from "./book-progress.controller";
import { BookProgressService } from "./book-progress.service";

@Module({
  imports: [],
  controllers: [BookProgressController],
  providers: [BookProgressService],
  exports: [BookProgressService],
})
export class BookProgressModule {}
