import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ClientIp, type ClientIpType } from "@/shared/decorators/client-ip.decorator";
import { GetPerksDto } from "../dto/get-perks.dto";
import { PerkService } from "../service/perk.service";

@ApiTags("Payment")
@Controller("/perk")
export class PerkController {
  constructor(private readonly perkService: PerkService) {}

  @Get("/")
  async getPerks(@ClientIp() clientIp: ClientIpType, @Query() query: GetPerksDto) {
    const perks = await this.perkService.getPerks(clientIp, query.currency);

    return { perks };
  }
}
