import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { resolveClientIp } from "@/shared/decorators/client-ip.decorator";

function buildRequest(overrides: Partial<Request>): Request {
  return {
    headers: {},
    socket: {},
    ...overrides,
  } as Request;
}

describe("resolveClientIp", () => {
  it("uses req.ip, which Express resolves from X-Forwarded-For under trust proxy", () => {
    const req = buildRequest({
      ip: "8.8.8.8",
      headers: { "x-forwarded-for": "8.8.8.8, 10.0.0.5" },
      socket: { remoteAddress: "172.17.0.1" } as Request["socket"],
    });

    expect(resolveClientIp(req)).toEqual({ address: "8.8.8.8", isLocal: false });
  });

  it("ignores a forged X-Forwarded-For when Express did not trust the hop", () => {
    const req = buildRequest({
      ip: "203.0.113.7",
      headers: { "x-forwarded-for": "1.2.3.4" },
      socket: { remoteAddress: "203.0.113.7" } as Request["socket"],
    });

    expect(resolveClientIp(req).address).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip when req.ip is unset", () => {
    const req = buildRequest({
      headers: { "x-real-ip": "9.9.9.9" },
      socket: { remoteAddress: "172.17.0.1" } as Request["socket"],
    });

    expect(resolveClientIp(req)).toEqual({ address: "9.9.9.9", isLocal: false });
  });

  it("flags the docker bridge gateway as local", () => {
    const req = buildRequest({
      socket: { remoteAddress: "172.17.0.1" } as Request["socket"],
    });

    expect(resolveClientIp(req)).toEqual({ address: "172.17.0.1", isLocal: true });
  });

  it("strips the IPv4-mapped IPv6 prefix from the returned address", () => {
    const req = buildRequest({ ip: "::ffff:1.2.3.4" });

    expect(resolveClientIp(req)).toEqual({ address: "1.2.3.4", isLocal: false });
  });

  it("still detects a local address behind the IPv4-mapped prefix", () => {
    const req = buildRequest({ ip: "::ffff:192.168.1.20" });

    expect(resolveClientIp(req)).toEqual({ address: "192.168.1.20", isLocal: true });
  });

  it("returns 0.0.0.0 when no source is available", () => {
    const req = buildRequest({});

    expect(resolveClientIp(req)).toEqual({ address: "0.0.0.0", isLocal: false });
  });
});
