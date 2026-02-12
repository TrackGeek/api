import { Module } from "@nestjs/common";
import { ReactionController } from "./reaction.controller";
import { ReactionService } from "./reaction.service";

@Module({
	imports: [],
	controllers: [ReactionController],
	providers: [ReactionService],
	exports: [ReactionService],
})
export class ReactionModule {}
