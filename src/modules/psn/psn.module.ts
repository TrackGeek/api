import { Module } from "@nestjs/common";
import { PsnController } from "./controller/psn.controller";
import { PsnAccountService } from "./service/psn-account.service";
import { PsnTrophyService } from "./service/psn-trophy.service";

@Module({
  controllers: [PsnController],
  providers: [PsnAccountService, PsnTrophyService],
  exports: [PsnAccountService, PsnTrophyService],
})
export class PsnModule {}
