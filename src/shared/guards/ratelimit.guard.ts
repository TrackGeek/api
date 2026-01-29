import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { CacheService } from "@/shared/infra/cache/cache.service";
import {
	RATE_LIMIT_KEY,
	RateLimitOptions,
} from "@/shared/decorators/ratelimit.decorator";
import { AppException } from "../exceptions/app.exceptions";
import { ERROR_CODES } from "../constants/error-codes";

@Injectable()
export class RateLimitGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly cacheService: CacheService,
	) {}

	private getIdentifier(request: any): string {
		const identifier =
			request.ip ||
			request.connection?.remoteAddress ||
			request.headers["x-forwarded-for"]?.split(",")[0] ||
			"unknown";

		if (
			identifier.includes("localhost") ||
			identifier.includes("127.0.0.1") ||
			identifier.startsWith("192.168.") ||
			identifier.startsWith("10.") ||
			/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(identifier) || // 172.16.0.0 - 172.31.255.255
			identifier.startsWith("169.254.") || // Link-local
			identifier.startsWith("fc") || // fc00::/7
			identifier.startsWith("fd") || // fc00::/7
			identifier.startsWith("fe80:") // fe80::/10 link-local
		) {
			return "local";
		}

		return identifier;
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const rateLimitOptions = this.reflector.getAllAndOverride<RateLimitOptions>(
			RATE_LIMIT_KEY,
			[context.getHandler(), context.getClass()],
		);

		if (!rateLimitOptions) {
			return true;
		}

		const request = context.switchToHttp().getRequest();
		const identifier = this.getIdentifier(request);

		const key = `ratelimit:${identifier}:${context.getHandler().name}`;
		const blockKey = `${key}:blocked`;

		const isBlocked = await this.cacheService.exists(blockKey);

		if (isBlocked) {
			// const ttl = await this.cacheService.getTTL(blockKey);
			// const retryAfter = ttl > 0 ? ttl : rateLimitOptions.blockDuration ?? 300;

			throw new AppException(ERROR_CODES.RATE_LIMIT_EXCEEDED);
		}

		const requestCount = await this.cacheService.increment(
			key,
			rateLimitOptions.window,
		);

		if (requestCount > rateLimitOptions.limit) {
			const blockDuration = rateLimitOptions.blockDuration ?? 300;

			await this.cacheService.setWithExpiry(blockKey, "1", blockDuration);
			await this.cacheService.delete(key);

			// blockDuration

			throw new AppException(ERROR_CODES.RATE_LIMIT_EXCEEDED);
		}

		const response = context.switchToHttp().getResponse();

		const ttl = await this.cacheService.getTTL(key);

		response.setHeader("X-RateLimit-Limit", rateLimitOptions.limit.toString());
		response.setHeader(
			"X-RateLimit-Remaining",
			(rateLimitOptions.limit - requestCount).toString(),
		);
		response.setHeader(
			"X-RateLimit-Reset",
			(Date.now() + ttl * 1000).toString(),
		);

		return true;
	}
}
