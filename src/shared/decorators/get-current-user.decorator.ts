import { ERROR_CODES } from "@/shared/constants/error-codes";
import {
	createParamDecorator,
	ExecutionContext,
	UnauthorizedException,
} from "@nestjs/common";
import type { Profile, User } from '@prisma/generated/client';

export type UserWithProfile = User & { profile: Profile }

export const GetCurrentUser = createParamDecorator(
	(_: any, context: ExecutionContext) => {
		const ctx = context.switchToHttp().getRequest();

		if (!ctx.user?.id?.length) {
			throw new UnauthorizedException(ERROR_CODES.USER_NOT_FOUND);
		}

		return ctx.user;
	},
);
