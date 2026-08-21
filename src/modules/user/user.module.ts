import { Global, Module } from "@nestjs/common";
import { CoinModule } from "@/modules/coin/coin.module";
import { MissionModule } from "@/modules/mission/mission.module";
import { XpModule } from "@/modules/xp/xp.module";
import { UserController } from "./controller/user.controller";
import { UserService } from "./service/user.service";

@Global()
@Module({
  imports: [XpModule, MissionModule, CoinModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
