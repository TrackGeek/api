import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PerkService } from "../service/perk.service";
import { ClientIp, type ClientIpType } from "@/shared/decorators/client-ip.decorator";

@ApiTags("Payment")
@Controller("/perk")
export class PerkController {
  constructor(private readonly perkService: PerkService) {}

  @Get("/")
  async getPerks(@ClientIp() clientIp: ClientIpType) {
    const perks = await this.perkService.getPerks(clientIp);

    return { perks };
  }
}
