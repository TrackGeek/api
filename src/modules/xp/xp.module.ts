import { Module } from "@nestjs/common";
import { XpController } from "./controller/xp.controller";
import { XpService } from "./service/xp.service";

@Module({
  imports: [],
  controllers: [XpController],
  providers: [XpService],
  exports: [XpService],
})
export class XpModule {}
