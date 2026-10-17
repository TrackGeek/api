import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { verifyJwsAccessToken } from "better-auth/oauth2";
import { getOAuthUrls } from "@/modules/auth/config/oauth.config";
import type { TrackGeekAuth } from "@/modules/auth/types/auth-instance";
import { UserService } from "@/modules/user/service/user.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import type { OAuthPrincipal } from "../types/oauth-principal";

@Injectable()
export class OAuthTokenService {
  constructor(
    private readonly auth: AuthService<TrackGeekAuth>,
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
    private readonly users: UserService,
  ) {}

  async authenticate(authorization: string | undefined, audience: string): Promise<OAuthPrincipal | null> {
    if (!authorization) return null;

    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    if (!match) throw new UnauthorizedException("invalid_token");

    let claims: Awaited<ReturnType<typeof verifyJwsAccessToken>>;

    try {
      claims = await verifyJwsAccessToken(match[1], {
        jwksFetch: () => this.auth.api.getJwks(),
        jwksCacheKey: this.auth.instance,
        verifyOptions: { issuer: getOAuthUrls(this.config).issuer, audience },
      });
    } catch {
      throw new UnauthorizedException("invalid_token");
    }

    if (
      typeof claims.sub !== "string" ||
      typeof claims.azp !== "string" ||
      typeof claims.scope !== "string" ||
      typeof claims.exp !== "number" ||
      typeof claims.trackgeekIssuedAt !== "number"
    ) {
      throw new UnauthorizedException("invalid_token");
    }

    const [client, consent, revocation] = await Promise.all([
      this.database.oAuthClient.findUnique({ where: { clientId: claims.azp }, select: { disabled: true } }),
      this.database.oAuthConsent.findFirst({ where: { userId: claims.sub, clientId: claims.azp } }),
      this.database.oAuthRevocation.findUnique({
        where: { userId_clientId: { userId: claims.sub, clientId: claims.azp } },
      }),
    ]);

    if (
      !client ||
      client.disabled ||
      !consent ||
      (revocation && claims.trackgeekIssuedAt <= revocation.revokedAt.getTime())
    ) {
      throw new UnauthorizedException("invalid_token");
    }

    const scopes = claims.scope.split(" ").filter((scope) => consent.scopes.includes(scope));
    await this.users.recordActivity(claims.sub);

    return { userId: claims.sub, clientId: claims.azp, scopes };
  }
}
