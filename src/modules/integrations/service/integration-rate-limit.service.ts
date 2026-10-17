import { HttpException, Injectable } from "@nestjs/common";
import type { OAuthPrincipal } from "@/modules/oauth/types/oauth-principal";
import { CacheService } from "@/shared/infra/cache/cache.service";

@Injectable()
export class IntegrationRateLimitService {
  constructor(private readonly cache: CacheService) {}

  async consume(principal: OAuthPrincipal | null, write: boolean, address: string) {
    const bucket = Math.floor(Date.now() / 60_000);
    const identity = principal ? `${principal.userId}:${principal.clientId}` : `anonymous:${address}`;
    const key = `integrations:rate:${identity}:${write ? "write" : "read"}:${bucket}`;
    const count = await this.cache.increment(key, 120);
    if (count > (write ? 30 : 120)) throw new HttpException("rate_limit_exceeded", 429);
  }
}
