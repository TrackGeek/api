import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { getOAuthUrls } from "@/modules/auth/config/oauth.config";
import { OAuthAccessException } from "@/modules/oauth/exceptions/oauth-access.exception";
import { OAuthTokenService } from "@/modules/oauth/service/oauth-token.service";
import { INTEGRATION_TOOLS, type IntegrationOperation, isIntegrationOperation } from "../constants/integration-tools";
import type { IntegrationRequest } from "../types/integration-request";

export const IntegrationAction = (name: IntegrationOperation) => SetMetadata("integrationAction", name);

@Injectable()
export class IntegrationGuard implements CanActivate {
  constructor(
    private readonly tokens: OAuthTokenService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<IntegrationRequest>();
    const urls = getOAuthUrls(this.config);
    const mcp = request.path === "/mcp" || request.path === "/mcp/";
    try {
      request.integrationPrincipal = await this.tokens.authenticate(
        request.headers.authorization,
        mcp ? urls.mcp : urls.api,
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) throw new OAuthAccessException("invalid_token");
      throw error;
    }

    const action =
      mcp && request.body?.method === "tools/call"
        ? request.body.params?.name
        : this.reflector.get<IntegrationOperation>("integrationAction", context.getHandler());
    const scope = isIntegrationOperation(action) ? INTEGRATION_TOOLS[action].scope : null;
    if (scope && !request.integrationPrincipal) throw new OAuthAccessException("invalid_token", [scope]);
    if (scope && !request.integrationPrincipal?.scopes.includes(scope))
      throw new OAuthAccessException("insufficient_scope", [scope]);
    return true;
  }
}
