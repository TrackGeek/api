import type { GenericEndpointContext } from "@better-auth/core";
import type { ConfigService } from "@nestjs/config";
import { APIError } from "better-auth/api";
import type { DatabaseService } from "@/shared/infra/database/database.service";
import { hashOAuthToken } from "../utils/hash-oauth-token";
import { getOAuthUrls } from "./oauth.config";

interface OAuthGrantBinding {
  resource: string;
  userId: string;
  clientId: string;
  authorizedAt: number;
}

interface OAuthGrantContext {
  trackgeekGrant?: OAuthGrantBinding;
  returned?: unknown;
}

function invalidGrant() {
  return new APIError("BAD_REQUEST", {
    error: "invalid_grant",
    error_description: "Authorization is invalid or has been revoked.",
  });
}

async function assertActiveGrant(ctx: GenericEndpointContext, database: DatabaseService, binding: OAuthGrantBinding) {
  const [consent, revocation] = await Promise.all([
    ctx.context.adapter.findOne({
      model: "oauthConsent",
      where: [
        { field: "userId", value: binding.userId },
        { field: "clientId", value: binding.clientId },
      ],
    }),
    database.oAuthRevocation.findUnique({
      where: { userId_clientId: { userId: binding.userId, clientId: binding.clientId } },
    }),
  ]);
  if (!consent || (revocation && binding.authorizedAt <= revocation.revokedAt.getTime())) throw invalidGrant();
}

export async function validateOAuthRequest(
  ctx: GenericEndpointContext,
  config: Pick<ConfigService, "get">,
  database: DatabaseService,
) {
  if (ctx.path !== "/oauth2/authorize" && ctx.path !== "/oauth2/token") return;
  const urls = getOAuthUrls(config);
  if (ctx.path === "/oauth2/authorize") {
    if (!ctx.query?.code_challenge || ctx.query.code_challenge_method !== "S256") {
      throw new APIError("BAD_REQUEST", { error: "invalid_request", error_description: "PKCE with S256 is required." });
    }
    const resources =
      ctx.request && new URL(ctx.request.url).pathname.endsWith("/oauth2/authorize")
        ? new URL(ctx.request.url).searchParams.getAll("resource")
        : typeof ctx.query.resource === "string"
          ? [ctx.query.resource]
          : [];
    if (resources.length !== 1 || ![urls.api, urls.mcp].includes(resources[0])) {
      throw new APIError("BAD_REQUEST", {
        error: "invalid_target",
        error_description: "A valid TrackGeek resource is required.",
      });
    }
    ctx.query.resource = resources[0];
    ctx.query.trackgeekAuthorizationIssuedAt = Date.now();
    if (!ctx.query.scope) {
      const client = await ctx.context.adapter.findOne<{ scopes?: string[] }>({
        model: "oauthClient",
        where: [{ field: "clientId", value: ctx.query.client_id }],
      });
      const readScopes = ["openid", "profile", "profile:read", "library:read"];
      ctx.query.scope = (client?.scopes ?? readScopes).filter((scope) => readScopes.includes(scope)).join(" ");
    }
    return;
  }

  const resource = ctx.body?.resource;
  if (typeof resource !== "string" || ![urls.api, urls.mcp].includes(resource)) {
    throw new APIError("BAD_REQUEST", {
      error: "invalid_target",
      error_description: "A valid TrackGeek resource is required.",
    });
  }
  let binding: OAuthGrantBinding;
  if (ctx.body.grant_type === "authorization_code") {
    if (typeof ctx.body.code !== "string" || typeof ctx.body.code_verifier !== "string") throw invalidGrant();
    const verification = await ctx.context.internalAdapter.findVerificationValue(hashOAuthToken(ctx.body.code));
    if (!verification || verification.expiresAt <= new Date()) throw invalidGrant();
    const value = JSON.parse(verification.value);
    if (
      value.type !== "authorization_code" ||
      value.query?.resource !== resource ||
      typeof value.query.trackgeekAuthorizationIssuedAt !== "number"
    )
      throw invalidGrant();
    binding = {
      resource,
      userId: value.userId,
      clientId: value.query.client_id,
      authorizedAt: value.query.trackgeekAuthorizationIssuedAt,
    };
  } else if (ctx.body.grant_type === "refresh_token") {
    if (typeof ctx.body.refresh_token !== "string") throw invalidGrant();
    const metadata = await ctx.context.internalAdapter.findVerificationValue(
      `trackgeek:refresh-resource:${hashOAuthToken(ctx.body.refresh_token)}`,
    );
    if (!metadata || metadata.expiresAt <= new Date()) throw invalidGrant();
    binding = JSON.parse(metadata.value);
    if (binding.resource !== resource) throw invalidGrant();
  } else {
    throw new APIError("BAD_REQUEST", { error: "unsupported_grant_type" });
  }
  await assertActiveGrant(ctx, database, binding);
  (ctx.context as OAuthGrantContext).trackgeekGrant = binding;
}

export async function bindOAuthResponse(ctx: GenericEndpointContext, database: DatabaseService) {
  if (ctx.path !== "/oauth2/token") return;
  const binding = (ctx.context as OAuthGrantContext).trackgeekGrant;
  const result = (ctx.context as OAuthGrantContext).returned;
  if (!binding || !result || typeof result !== "object" || !("access_token" in result)) return;
  await assertActiveGrant(ctx, database, binding);
  if ("refresh_token" in result && typeof result.refresh_token === "string") {
    await ctx.context.internalAdapter.createVerificationValue({
      identifier: `trackgeek:refresh-resource:${hashOAuthToken(result.refresh_token)}`,
      value: JSON.stringify(binding),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  }
}
