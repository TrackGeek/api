import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { StripeService } from "./stripe.service";
import { UserTier } from "@prisma/generated/enums";
import type { ClientIpType } from "@/shared/decorators/client-ip.decorator";

@Injectable()
export class PerkService {
  constructor(
    @Inject(forwardRef(() => StripeService))
    private readonly stripeService: StripeService,
  ) {}

  async getPerks(clientIp?: ClientIpType) {
    const names = [UserTier.Tracker, UserTier.Archivist, UserTier.ArchiveMaster];
    const filteredPrices = [300, 500, 1500];
    const prices = await this.stripeService.getPrices(clientIp);

    const perks = prices
      .filter((price) => filteredPrices.includes(price.value.original.raw))
      .sort((a, b) => a.value.converted.raw - b.value.converted.raw)
      .map((price, index) => ({
        id: `perk_${index + 1}`,
        name: names[index],
        productId: price.productId,
        value: price.value,
      }));

    return perks;
  }

  async perkToGive(accumulatedMoney: number, currentTier?: UserTier | null) {
    const tierOrder = [UserTier.Tracker, UserTier.Archivist, UserTier.ArchiveMaster];
    const perks = await this.getPerks();

    const perk = perks.findLast((perk) => accumulatedMoney >= perk.value.original.raw);

    if (!perk) {
      return null;
    }

    if (currentTier && tierOrder.indexOf(perk.name) <= tierOrder.indexOf(currentTier)) {
      return null;
    }

    return perk;
  }
}
