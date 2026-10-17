import { describe, expect, it, vi } from "vitest";
import { IntegrationRateLimitService } from "@/modules/integrations/service/integration-rate-limit.service";

describe("Integration rate limits", () => {
  it("limits writes independently from reads for each account and application", async () => {
    const increment = vi
      .fn()
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(31)
      .mockResolvedValueOnce(120)
      .mockResolvedValueOnce(121);
    const limiter = new IntegrationRateLimitService({ increment } as any);
    const principal = { userId: "owner", clientId: "client", scopes: ["progress:write"] };
    await limiter.consume(principal, true, "address");
    await expect(limiter.consume(principal, true, "address")).rejects.toMatchObject({ status: 429 });
    await limiter.consume(principal, false, "address");
    await expect(limiter.consume(principal, false, "address")).rejects.toMatchObject({ status: 429 });
    expect(increment.mock.calls[0][0]).toContain("owner:client:write:");
    expect(increment.mock.calls[2][0]).toContain("owner:client:read:");
  });
});
