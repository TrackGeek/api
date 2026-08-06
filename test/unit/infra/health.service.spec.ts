import { HealthIndicatorService } from "@nestjs/terminus";
import { describe, expect, it, vi } from "vitest";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { HealthService } from "@/shared/infra/health/health.service";

function createHealthService(ping: () => Promise<string>) {
  const cacheService = { redis: { ping } } as unknown as CacheService;

  return new HealthService(new HealthIndicatorService(), cacheService);
}

describe("HealthService", () => {
  it("marks redis as up when the ping succeeds", async () => {
    const ping = vi.fn().mockResolvedValue("PONG");

    const result = await createHealthService(ping).checkRedis("redis");

    expect(ping).toHaveBeenCalledOnce();
    expect(result).toEqual({ redis: { status: "up" } });
  });

  it("marks redis as down with the error message when the ping fails", async () => {
    const ping = vi.fn().mockRejectedValue(new Error("Connection is closed."));

    const result = await createHealthService(ping).checkRedis("redis");

    expect(result).toEqual({
      redis: { status: "down", message: "Connection is closed." },
    });
  });
});
