import { Module } from "@nestjs/common";
import { ReactionController } from "./reaction.controller";
import { ReactionService } from "./reaction.service";
import { ProfileModule } from "../profile/profile.module";

@Module({
	imports: [ProfileModule],
	controllers: [ReactionController],
	providers: [ReactionService],
	exports: [ReactionService],
})
export class ReactionModule {}
