import { Module } from "@nestjs/common";

import { FavoriteController } from "./favorite.controller";
import { FavoriteService } from "./favorite.service";

@Module({
  imports: [],
  controllers: [FavoriteController],
  providers: [FavoriteService],
  exports: [FavoriteService],
})
export class FavoriteModule {}
