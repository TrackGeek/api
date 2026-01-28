import {
	CanActivate,
	ExecutionContext,
	Injectable,
	Logger,
	UnauthorizedException,
} from "@nestjs/common";
import { JwtService, TokenExpiredError } from "@nestjs/jwt";

import { ERROR_CODES } from "@/config/errors.config";
import { UserService } from "../user/user.service";

@Injectable()
export class AuthGuard implements CanActivate {
	private readonly logger = new Logger(AuthGuard.name);

	constructor(
		private readonly jwtService: JwtService,
		private readonly userService: UserService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();

		const accessToken = request.cookies?.["trackgeek-access-token"] ?? null;

		if (!accessToken) {
			throw new UnauthorizedException(ERROR_CODES.ACCESS_TOKEN_MISSING);
		}

		try {
			const decoded = await this.jwtService.verifyAsync(accessToken, {
				secret: process.env.JWT_ACCESS_SECRET,
			});

			const userId = decoded.userId;

			const user = await this.userService.getUserById(userId);

			if (!user) {
				throw new UnauthorizedException(ERROR_CODES.USER_NOT_FOUND);
			}

			request.user = user;

			return true;
		} catch (error) {
			this.logger.error("AuthGuard error:", error);

			if (error instanceof TokenExpiredError) {
				throw new UnauthorizedException(ERROR_CODES.ACCESS_TOKEN_EXPIRED);
			}

			throw new UnauthorizedException(ERROR_CODES.INVALID_ACCESS_TOKEN);
		}
	}
}
