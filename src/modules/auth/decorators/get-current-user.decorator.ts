import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const GetCurrentUser = createParamDecorator(
  (_: any, context: ExecutionContext) => {
    const ctx = context.switchToHttp().getRequest();

    if (!ctx.user?.id?.length) {
      throw new UnauthorizedException('User not found in request context.');
    }

    return ctx.user;
  },
);
