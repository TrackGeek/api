import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

export interface ClientIpType {
  address: string;
  isLocal: boolean;
}

const LOCAL_IP_PATTERNS = [
  /^127\./, // 127.0.0.0/8  — loopback
  /^10\./, // 10.0.0.0/8   — private class A
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12 — private class B
  /^192\.168\./, // 192.168.0.0/16 — private class C
  /^::1$/, // IPv6 loopback
  /^fc00:/i, // IPv6 unique local
  /^fd[0-9a-f]{2}:/i, // IPv6 unique local
  /^fe80:/i, // IPv6 link-local
];

function normalizeIp(ip: string): string {
  return ip.replace(/^::ffff:/i, "").trim();
}

function extractIp(req: Request): string {
  if (req.ip) return normalizeIp(req.ip);

  const realIp = req.headers["x-real-ip"];

  if (realIp) {
    const first = Array.isArray(realIp) ? realIp[0] : realIp.split(",")[0];

    return normalizeIp(first);
  }

  return req.socket?.remoteAddress ? normalizeIp(req.socket.remoteAddress) : "0.0.0.0";
}

function isLocalIp(ip: string): boolean {
  return LOCAL_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

export function resolveClientIp(req: Request): ClientIpType {
  const address = extractIp(req);

  return {
    address,
    isLocal: isLocalIp(address),
  };
}

export const ClientIp = createParamDecorator((_data: unknown, ctx: ExecutionContext): ClientIpType => {
  return resolveClientIp(ctx.switchToHttp().getRequest<Request>());
});
