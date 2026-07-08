import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ClientIp, type ClientIpType } from "@/shared/decorators/client-ip.decorator";
import { PerkService } from "../service/perk.service";

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
