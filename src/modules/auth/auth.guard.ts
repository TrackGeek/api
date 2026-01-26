import { PrismaService } from "@/infra/prisma/prisma.service";
import {
	CanActivate,
	ExecutionContext,
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		private readonly jwtService: JwtService,
		private readonly prismaService: PrismaService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();

		const accessToken = request.cookies?.["accessToken"] ?? null;

		if (!accessToken) {
			throw new UnauthorizedException("No access token provided.");
		}

		try {
			const decoded = await this.jwtService.verifyAsync(accessToken, {
				secret: process.env.JWT_ACCESS_SECRET,
			});

			const userId = decoded.userId;

			const user = await this.prismaService.user.findUnique({
				where: { id: userId },
			});

			if (!user) {
				throw new NotFoundException("User not found.");
			}

			request.user = user;

			return true;
		} catch (error) {
			console.error("AuthGuard error:", error);

			throw new UnauthorizedException("Invalid or expired token.");
		}
	}
}
