import { Module } from "@nestjs/common";
import { NotificationController } from "./controller/notification.controller";
import { NotificationService } from "./service/notification.service";

@Module({
  imports: [],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
