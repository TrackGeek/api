import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { GetCoinHistoryDto } from "../dto/get-coin-history.dto";
import { CoinService } from "../service/coin.service";

@ApiTags("Coin")
@Controller("/coins")
export class CoinController {
  constructor(private readonly coinService: CoinService) {}

  @Get("/me")
  @UseGuards(AuthGuard)
  async getMyWallet(@Session() session: UserSession) {
    const wallet = await this.coinService.getWalletByUserId(session.user.id);

    return { wallet };
  }

  @Get("/history")
  @UseGuards(AuthGuard)
  async getMyCoinHistory(@Session() session: UserSession, @Query() query: GetCoinHistoryDto) {
    const history = await this.coinService.getCoinHistory(session.user.id, query);

    return { history };
  }
}
