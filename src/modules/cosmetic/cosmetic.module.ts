import { Module } from "@nestjs/common";
import { CoinModule } from "@/modules/coin/coin.module";
import { CosmeticController } from "./controller/cosmetic.controller";
import { CosmeticService } from "./service/cosmetic.service";

@Module({
  imports: [CoinModule],
  controllers: [CosmeticController],
  providers: [CosmeticService],
  exports: [CosmeticService],
})
export class CosmeticModule {}
