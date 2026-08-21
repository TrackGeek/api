import { Module } from "@nestjs/common";
import { CoinController } from "./controller/coin.controller";
import { CoinService } from "./service/coin.service";

@Module({
  imports: [],
  controllers: [CoinController],
  providers: [CoinService],
  exports: [CoinService],
})
export class CoinModule {}
