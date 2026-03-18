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

function extractIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];

  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    
    return first.trim();
  }

  return req.socket?.remoteAddress ?? req.ip ?? "0.0.0.0";
}

function isLocalIp(ip: string): boolean {
  const normalized = ip.replace(/^::ffff:/i, "");
  
  return LOCAL_IP_PATTERNS.some((pattern) => pattern.test(normalized));
}

export const ClientIp = createParamDecorator((_data: unknown, ctx: ExecutionContext): ClientIpType => {
  const req = ctx.switchToHttp().getRequest<Request>();
  const address = extractIp(req);

  return {
    address,
    isLocal: isLocalIp(address),
  };
});
