import { Module } from "@nestjs/common";
import { ReactionController } from "./controller/reaction.controller";
import { ReactionService } from "./service/reaction.service";

@Module({
  imports: [],
  controllers: [ReactionController],
  providers: [ReactionService],
  exports: [ReactionService],
})
export class ReactionModule {}
