import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { PurchaseCosmeticDto } from "../dto/purchase-cosmetic.dto";
import { CosmeticService } from "../service/cosmetic.service";

@ApiTags("Cosmetic")
@Controller("/cosmetics")
@UseGuards(AuthGuard)
export class CosmeticController {
  constructor(private readonly cosmeticService: CosmeticService) {}

  @Get("/")
  async getCosmetics(@Session() session: UserSession) {
    return this.cosmeticService.getCatalog(session.user.id);
  }

  @Post("/purchase")
  async purchaseCosmetic(@Session() session: UserSession, @Body() purchaseCosmeticDto: PurchaseCosmeticDto) {
    return this.cosmeticService.purchaseCosmetic(session.user.id, purchaseCosmeticDto);
  }
}
