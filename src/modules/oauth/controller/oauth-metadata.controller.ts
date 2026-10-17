import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { getOAuthUrls, INTEGRATION_SCOPES } from "@/modules/auth/config/oauth.config";
import type { TrackGeekAuth } from "@/modules/auth/types/auth-instance";

@Controller("/.well-known")
export class OAuthMetadataController {
  constructor(
    private readonly auth: AuthService<TrackGeekAuth>,
    private readonly config: ConfigService,
  ) {}

  @Get(["/oauth-authorization-server", "/oauth-authorization-server/auth"])
  async authorizationServer() {
    return this.auth.api.getOAuthServerConfig();
  }

  @Get(["/openid-configuration", "/openid-configuration/auth"])
  async openId() {
    return this.auth.api.getOpenIdConfig();
  }

  @Get(["/oauth-protected-resource", "/oauth-protected-resource/mcp"])
  mcpResource() {
    return this.resource(getOAuthUrls(this.config).mcp);
  }

  @Get("/oauth-protected-resource/integrations/v1")
  apiResource() {
    return this.resource(getOAuthUrls(this.config).api);
  }

  private resource(resource: string) {
    return {
      resource,
      authorization_servers: [getOAuthUrls(this.config).issuer],
      scopes_supported: INTEGRATION_SCOPES,
      bearer_methods_supported: ["header"],
    };
  }
}
