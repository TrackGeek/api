import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { HealthCheck, HealthCheckService, MemoryHealthIndicator, PrismaHealthIndicator } from "@nestjs/terminus";
import { SkipThrottle } from "@nestjs/throttler";
import { DatabaseService } from "../database/database.service";
import { DEFAULT_MEMORY_HEAP_LIMIT, DEFAULT_MEMORY_RSS_LIMIT } from "./health.config";
import { HealthService } from "./health.service";

@ApiTags("Health")
@Controller("/health")
@SkipThrottle({ read: true, write: true })
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly prismaHealthIndicator: PrismaHealthIndicator,
    private readonly memoryHealthIndicator: MemoryHealthIndicator,
    private readonly databaseService: DatabaseService,
    private readonly healthService: HealthService,
  ) {}

  @Get("/")
  @HealthCheck()
  async check() {
    return this.healthCheckService.check([
      () => this.prismaHealthIndicator.pingCheck("database", this.databaseService),
      () => this.healthService.checkRedis("redis"),
      () => this.memoryHealthIndicator.checkHeap("memory_heap", DEFAULT_MEMORY_HEAP_LIMIT),
      () => this.memoryHealthIndicator.checkRSS("memory_rss", DEFAULT_MEMORY_RSS_LIMIT),
    ]);
  }
}
