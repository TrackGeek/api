import { oauthProvider } from "@better-auth/oauth-provider";
import { ConfigService } from "@nestjs/config";
import { jwt } from "better-auth/plugins";
import { z } from "zod";
import { hashOAuthToken } from "../utils/hash-oauth-token";

export const INTEGRATION_SCOPES = ["profile:read", "library:read", "progress:write"] as const;
export const OAUTH_SCOPES = ["openid", "profile", "offline_access", ...INTEGRATION_SCOPES] as const;

export function getOAuthUrls(config: Pick<ConfigService, "get">) {
  const base = (config.get<string>("BETTER_AUTH_URL") ?? "http://localhost:40287").replace(/\/$/, "");
  const origin = new URL(base).origin;

  return {
    issuer: `${origin}/auth`,
    api: `${origin}/integrations/v1`,
    mcp: `${origin}/mcp`,
    metadata: `${origin}/.well-known/oauth-protected-resource`,
  };
}

export function getOAuthPlugins(
  config: Pick<ConfigService, "get">,
): [ReturnType<typeof jwt>, ReturnType<typeof oauthProvider>] {
  const urls = getOAuthUrls(config);
  const web = (config.get<string>("WEB_URL") ?? "http://localhost:3000").replace(/\/$/, "");

  const provider = oauthProvider({
    loginPage: `${web}/oauth/authorize`,
    consentPage: `${web}/oauth/authorize`,
    scopes: [...OAUTH_SCOPES],
    validAudiences: [urls.api, urls.mcp],
    grantTypes: ["authorization_code", "refresh_token"],
    accessTokenExpiresIn: 600,
    codeExpiresIn: 300,
    refreshTokenExpiresIn: 60 * 60 * 24 * 30,
    allowDynamicClientRegistration: config.get<string>("OAUTH_ALLOW_DYNAMIC_REGISTRATION") !== "false",
    allowUnauthenticatedClientRegistration: config.get<string>("OAUTH_ALLOW_DYNAMIC_REGISTRATION") !== "false",
    clientRegistrationDefaultScopes: [...OAUTH_SCOPES],
    clientRegistrationAllowedScopes: [...OAUTH_SCOPES],
    customAccessTokenClaims: () => ({ trackgeekIssuedAt: Date.now() }),
    storeTokens: { hash: hashOAuthToken },
    silenceWarnings: { oauthAuthServerConfig: true },
    schema: {
      oauthClient: { modelName: "oAuthClient" },
      oauthConsent: { modelName: "oAuthConsent" },
      oauthAccessToken: { modelName: "oAuthAccessToken" },
      oauthRefreshToken: { modelName: "oAuthRefreshToken" },
    },
  });
  Object.assign(provider.endpoints.oauth2Authorize.options, {
    query: provider.endpoints.oauth2Authorize.options.query.extend({
      resource: z.string(),
      trackgeekAuthorizationIssuedAt: z.number().optional(),
    }),
  });

  return [jwt({ jwt: { issuer: urls.issuer }, disableSettingJwtHeader: true }), provider];
}
