import {
	CanActivate,
	ExecutionContext,
	Injectable,
	Logger,
} from "@nestjs/common";
import { JwtService, TokenExpiredError } from "@nestjs/jwt";

import { ERROR_CODES } from "@/shared/constants/error-codes";
import { UserService } from "@/modules/user/user.service";
import { AppException } from "../exceptions/app.exceptions";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthGuard implements CanActivate {
	private readonly logger = new Logger(AuthGuard.name);

	constructor(
		private readonly configService: ConfigService,
		private readonly jwtService: JwtService,
		private readonly userService: UserService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();

		const accessToken = request.cookies?.["trackgeek-access-token"] ?? null;

		if (!accessToken) {
			throw new AppException(ERROR_CODES.ACCESS_TOKEN_MISSING);
		}

		try {
			const decoded = await this.jwtService.verifyAsync(accessToken, {
				secret: this.configService.get<string>("JWT_ACCESS_SECRET"),
			});

			const userId = decoded.userId;

			const user = await this.userService.getUserById(userId);

			if (!user) {
				throw new AppException(ERROR_CODES.USER_NOT_FOUND);
			}

			request.user = user;

			return true;
		} catch (error) {
			this.logger.error("AuthGuard error:", error);

			if (error instanceof TokenExpiredError) {
				throw new AppException(ERROR_CODES.ACCESS_TOKEN_EXPIRED);
			}

			throw new AppException(ERROR_CODES.INVALID_ACCESS_TOKEN);
		}
	}
}
