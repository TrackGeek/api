import { Module } from "@nestjs/common";
import { ReactionController } from "./reaction.controller";
import { ReactionService } from "./reaction.service";
import { UserModule } from '../user/user.module';

@Module({
	imports: [UserModule],
	controllers: [ReactionController],
	providers: [ReactionService],
	exports: [ReactionService],
})
export class ReactionModule {}
