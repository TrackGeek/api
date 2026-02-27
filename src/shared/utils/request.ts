import type { HttpService } from "@nestjs/axios";
import { Request } from "express";
import { from, lastValueFrom, timer } from "rxjs";
import { concatMap, delayWhen, toArray } from "rxjs/operators";

export async function manyRequestWithDelay({
  urls,
  httpService,
  delayMs = 400,
}: {
  urls: string[];
  httpService: HttpService;
  delayMs?: number;
}) {
  return await lastValueFrom(
    from(urls).pipe(
      concatMap((url) => httpService.get(url).pipe(delayWhen(() => timer(delayMs)))),
      toArray(),
    ),
  );
}

export function getIp(request: Request): string {
  const identifier =
    request.ip ||
    request.connection?.remoteAddress ||
    (request.headers?.["x-forwarded-for"] as string)?.split(",")?.[0] ||
    "unknown";

  if (
    ["localhost", "127.0.0.1"].includes(identifier) ||
    identifier.startsWith("192.168.") ||
    identifier.startsWith("10.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(identifier) ||
    identifier.startsWith("169.254.") ||
    identifier.startsWith("fc") ||
    identifier.startsWith("fd") ||
    identifier.startsWith("fe80:")
  ) {
    return "local";
  }

  return identifier;
}
