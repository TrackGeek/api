import { Module } from "@nestjs/common";

import { CommentService } from "./comment.service";
import { CommentController } from "./comment.controller";
import { ProfileModule } from "../profile/profile.module";

@Module({
	imports: [ProfileModule],
	controllers: [CommentController],
	providers: [CommentService],
	exports: [CommentService],
})
export class CommentModule {}
