import { Module } from "@nestjs/common";
import { RewindController } from "./controller/rewind.controller";
import { RewindService } from "./service/rewind.service";

@Module({
  controllers: [RewindController],
  providers: [RewindService],
})
export class RewindModule {}
