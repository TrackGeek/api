import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@prisma/generated/enums";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { ROLES_KEY } from "@/shared/decorators/roles.decorator";
import { AppException } from "@/shared/exceptions/app.exceptions";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!roles || roles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ session?: { user?: { role?: UserRole } } }>();
    const role = request.session?.user?.role;

    if (!role || !roles.includes(role)) {
      throw new AppException(ERROR_CODES.FORBIDDEN_ROLE);
    }

    return true;
  }
}
