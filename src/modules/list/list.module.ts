import { Module } from "@nestjs/common";

import { ListController } from "./controller/list.controller";
import { ListService } from "./service/list.service";

@Module({
  imports: [],
  controllers: [ListController],
  providers: [ListService],
  exports: [ListService],
})
export class ListModule {}
