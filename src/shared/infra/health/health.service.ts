import { Injectable } from "@nestjs/common";
import { HealthIndicatorResult, HealthIndicatorService } from "@nestjs/terminus";
import { CacheService } from "../cache/cache.service";

@Injectable()
export class HealthService {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly cacheService: CacheService,
  ) {}

  async checkRedis<Key extends string>(key: Key): Promise<HealthIndicatorResult<Key>> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      await this.cacheService.redis.ping();

      return indicator.up();
    } catch (error) {
      return indicator.down({ message: error instanceof Error ? error.message : "Redis ping failed" });
    }
  }
}
