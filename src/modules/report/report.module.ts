import { Module } from "@nestjs/common";
import { ChatModule } from "../chat/chat.module";
import { CommentModule } from "../comment/comment.module";
import { ReportController } from "./controller/report.controller";
import { ReportAdminController } from "./controller/report-admin.controller";
import { ReportService } from "./service/report.service";

@Module({
  imports: [ChatModule, CommentModule],
  controllers: [ReportController, ReportAdminController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
