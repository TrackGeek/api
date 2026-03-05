import { Module } from "@nestjs/common";

import { FavoriteController } from "./controller/favorite.controller";
import { FavoriteService } from "./service/favorite.service";

@Module({
  imports: [],
  controllers: [FavoriteController],
  providers: [FavoriteService],
  exports: [FavoriteService],
})
export class FavoriteModule {}
