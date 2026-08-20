import { Module } from "@nestjs/common";
import { MissionController } from "./controller/mission.controller";
import { MissionAdminController } from "./controller/mission-admin.controller";
import { MissionService } from "./service/mission.service";

@Module({
  imports: [],
  controllers: [MissionController, MissionAdminController],
  providers: [MissionService],
  exports: [MissionService],
})
export class MissionModule {}
