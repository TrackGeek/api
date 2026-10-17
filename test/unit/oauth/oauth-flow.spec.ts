import { createHash, randomBytes } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { toNodeHandler } from "better-auth/node";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthConfig } from "@/modules/auth/config/auth.config";
import { getOAuthPlugins, getOAuthUrls } from "@/modules/auth/config/oauth.config";
import { IntegrationController } from "@/modules/integrations/controller/integration.controller";
import { IntegrationExceptionFilter } from "@/modules/integrations/filters/integration-exception.filter";
import { IntegrationGuard } from "@/modules/integrations/guards/integration.guard";
import { IntegrationOperationsService } from "@/modules/integrations/service/integration-operations.service";
import { TrackingLibraryService } from "@/modules/integrations/service/tracking-library.service";
import { McpController } from "@/modules/mcp/controller/mcp.controller";
import { McpServerService } from "@/modules/mcp/service/mcp-server.service";
import { OAuthMetadataController } from "@/modules/oauth/controller/oauth-metadata.controller";
import { OAuthTokenService } from "@/modules/oauth/service/oauth-token.service";
import { UserService } from "@/modules/user/service/user.service";
import { DatabaseService } from "@/shared/infra/database/database.service";

const WEB = "http://localhost:5173";
const ORIGIN = "http://localhost:40287";
const ID = "019ce334-c8ac-7883-949d-948f53218272";

async function setup() {
  const data: Record<string, any[]> = {
    user: [],
    session: [],
    account: [],
    verification: [],
    jwks: [],
    oAuthClient: [],
    oAuthConsent: [],
    oAuthAccessToken: [],
    oAuthRefreshToken: [],
  };
  const settings = { BETTER_AUTH_URL: ORIGIN, WEB_URL: WEB };
  const config = { get: (key: keyof typeof settings) => settings[key] } as ConfigService;
  let revokedAt: Date | null = null;
  const database = {
    oAuthClient: {
      findUnique: vi.fn(async ({ where }) => data.oAuthClient.find((row) => row.clientId === where.clientId) ?? null),
    },
    oAuthConsent: {
      findFirst: vi.fn(
        async ({ where }) =>
          data.oAuthConsent.find((row) => row.clientId === where.clientId && row.userId === where.userId) ?? null,
      ),
    },
    oAuthRevocation: { findUnique: vi.fn(async () => (revokedAt ? { revokedAt } : null)) },
    user: {
      findUniqueOrThrow: vi.fn(async ({ where }) => ({
        id: where.id,
        name: "Reader",
        username: "reader",
        profile: null,
      })),
    },
  };
  const authConfig = getAuthConfig({ configService: config, databaseService: database as any });
  const auth = betterAuth({
    baseURL: ORIGIN,
    basePath: "/auth",
    secret: "oauth-flow-test-secret-at-least-32-characters",
    database: memoryAdapter(data),
    trustedOrigins: [WEB],
    emailAndPassword: { enabled: true },
    plugins: getOAuthPlugins(config),
    hooks: authConfig.hooks,
    disabledPaths: authConfig.disabledPaths,
  });
  const signup = await auth.api.signUpEmail({
    body: { email: "reader@example.com", password: "test-password-123", name: "Reader" },
    returnHeaders: true,
  });
  const cookie = signup.headers
    .getSetCookie()
    .find((value) => value.startsWith("better-auth.session_token="))!
    .split(";")[0];
  const catalog = {
    search: vi.fn().mockResolvedValue({ items: [{ title: "Dune" }] }),
    details: vi.fn(),
    episodes: vi.fn(),
  };
  const media = { getBookProgress: vi.fn().mockResolvedValue({ bookProgresses: { items: [], total: 0 } }) };
  const library = new TrackingLibraryService(
    database as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    media as any,
    {} as any,
  );
  const progress = { setBook: vi.fn(async (userId, input) => ({ userId, ...input })) };
  const rateLimit = { consume: vi.fn() };
  const operations = new IntegrationOperationsService(catalog as any, library, progress as any, rateLimit as any);
  const users = { recordActivity: vi.fn() };
  Reflect.defineMetadata("design:paramtypes", [IntegrationOperationsService], IntegrationController);
  Reflect.defineMetadata("design:paramtypes", [McpServerService, ConfigService], McpController);
  Reflect.defineMetadata("design:paramtypes", [AuthService, ConfigService], OAuthMetadataController);
  Reflect.defineMetadata("design:paramtypes", [OAuthTokenService, ConfigService, Reflector], IntegrationGuard);
  Reflect.defineMetadata("design:paramtypes", [ConfigService], IntegrationExceptionFilter);
  Reflect.defineMetadata(
    "design:paramtypes",
    [AuthService, DatabaseService, ConfigService, UserService],
    OAuthTokenService,
  );
  Reflect.defineMetadata("design:paramtypes", [IntegrationOperationsService], McpServerService);
  const module = await Test.createTestingModule({
    controllers: [IntegrationController, McpController, OAuthMetadataController],
    providers: [
      IntegrationGuard,
      IntegrationExceptionFilter,
      OAuthTokenService,
      McpServerService,
      { provide: ConfigService, useValue: config },
      { provide: AuthService, useValue: { api: auth.api, instance: auth } },
      { provide: DatabaseService, useValue: database },
      { provide: UserService, useValue: users },
      { provide: IntegrationOperationsService, useValue: operations },
    ],
  }).compile();
  const app = module.createNestApplication({ bodyParser: false });
  app.use("/auth", toNodeHandler(auth));
  const express = await import("express");
  app.use(express.json());
  await app.init();
  const http = () => request(app.getHttpServer());
  const urls = getOAuthUrls(config);

  async function createClient(scopes = "library:read progress:write offline_access") {
    return auth.api.createOAuthClient({
      headers: new Headers({ cookie, origin: WEB }),
      body: {
        client_name: "Test app",
        redirect_uris: ["https://client.example/callback"],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        scope: scopes,
      },
    });
  }

  async function authorize(scopes = "library:read progress:write offline_access", resource = urls.api) {
    const client = await createClient(scopes);
    const verifier = randomBytes(32).toString("base64url");
    const query = {
      client_id: client.client_id,
      response_type: "code",
      redirect_uri: "https://client.example/callback",
      scope: scopes,
      state: "test-state",
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
      resource,
    };
    const response = await http()
      .get("/auth/oauth2/authorize")
      .set("Host", "localhost:40287")
      .set("Cookie", cookie)
      .set("Accept", "application/json")
      .query(query);
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.url).toContain(`${WEB}/oauth/authorize?`);
    expect(new URL(response.body.url).searchParams.get("resource")).toBe(resource);
    const consent = await http()
      .post("/auth/oauth2/consent")
      .set("Host", "localhost:40287")
      .set("Cookie", cookie)
      .set("Origin", WEB)
      .send({ accept: true, oauth_query: new URL(response.body.url).search.slice(1) });
    expect(consent.status, JSON.stringify(consent.body)).toBe(200);
    const code = new URL(consent.body.url).searchParams.get("code");
    expect(code).toBeTruthy();
    return { client, verifier, code, resource };
  }

  async function token(grant: Awaited<ReturnType<typeof authorize>>, overrides: Record<string, unknown> = {}) {
    return http()
      .post("/auth/oauth2/token")
      .set("Host", "localhost:40287")
      .type("form")
      .send({
        grant_type: "authorization_code",
        client_id: grant.client.client_id,
        code: grant.code,
        code_verifier: grant.verifier,
        redirect_uri: "https://client.example/callback",
        resource: grant.resource,
        ...overrides,
      });
  }

  return {
    app,
    http,
    data,
    auth,
    urls,
    authorize,
    token,
    createClient,
    cookie,
    progress,
    media,
    users,
    rateLimit,
    revoke: (at = new Date()) => {
      revokedAt = at;
    },
  };
}

describe("OAuth and MCP integration", () => {
  let fixture: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => {
    fixture = await setup();
  });
  afterEach(async () => {
    await fixture?.app.close();
  });

  it("publishes discovery and issues audience-bound tokens after PKCE and consent", async () => {
    const metadata = await fixture.http().get("/.well-known/oauth-authorization-server/auth");
    expect(metadata.body).toMatchObject({ issuer: `${ORIGIN}/auth`, code_challenge_methods_supported: ["S256"] });
    const resource = await fixture.http().get("/.well-known/oauth-protected-resource/mcp");
    expect(resource.body.resource).toBe(fixture.urls.mcp);
    const grant = await fixture.authorize("profile:read library:read offline_access");
    const response = await fixture.token(grant);
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body).toMatchObject({
      token_type: "Bearer",
      access_token: expect.any(String),
      refresh_token: expect.any(String),
    });
    expect(fixture.data.oAuthRefreshToken[0].token).not.toBe(response.body.refresh_token);
    const profile = await fixture
      .http()
      .get("/integrations/v1/me")
      .set("Authorization", `Bearer ${response.body.access_token}`);
    expect(profile.status, JSON.stringify(profile.body)).toBe(200);
    expect(profile.body).toEqual({ id: fixture.data.user[0].id, name: "Reader", username: "reader", profile: null });
    expect(fixture.users.recordActivity).toHaveBeenCalledWith(fixture.data.user[0].id);
  });

  it("rejects wrong PKCE, code replay and changing the authorized resource", async () => {
    const wrongResource = await fixture.authorize();
    expect((await fixture.token(wrongResource, { resource: fixture.urls.mcp })).status).toBe(400);
    const wrongPkce = await fixture.authorize();
    expect((await fixture.token(wrongPkce, { code_verifier: "x".repeat(43) })).status).toBeGreaterThanOrEqual(400);
    const grant = await fixture.authorize();
    expect((await fixture.token(grant)).status).toBe(200);
    expect((await fixture.token(grant)).status).toBeGreaterThanOrEqual(400);
  });

  it("rotates refresh tokens and keeps refresh bound to the original resource", async () => {
    const grant = await fixture.authorize();
    const initial = await fixture.token(grant);
    expect(initial.status, JSON.stringify(initial.body)).toBe(200);
    const refresh = (resource: string, token: string) =>
      fixture
        .http()
        .post("/auth/oauth2/token")
        .set("Host", "localhost:40287")
        .type("form")
        .send({ grant_type: "refresh_token", client_id: grant.client.client_id, refresh_token: token, resource });
    expect((await refresh(fixture.urls.mcp, initial.body.refresh_token)).status).toBe(400);
    const renewed = await refresh(fixture.urls.api, initial.body.refresh_token);
    expect(renewed.status, JSON.stringify(renewed.body)).toBe(200);
    expect(renewed.body.refresh_token).not.toBe(initial.body.refresh_token);
    expect((await refresh(fixture.urls.api, initial.body.refresh_token)).status).toBeGreaterThanOrEqual(400);
  });

  it("continues OAuth after browser sign-in and rejects consent query tampering", async () => {
    const client = await fixture.createClient("library:read");
    const verifier = randomBytes(32).toString("base64url");
    const initial = await fixture
      .http()
      .get("/auth/oauth2/authorize")
      .set("Host", "localhost:40287")
      .set("Accept", "application/json")
      .query({
        client_id: client.client_id,
        response_type: "code",
        redirect_uri: "https://client.example/callback",
        scope: "library:read",
        resource: fixture.urls.api,
        code_challenge: createHash("sha256").update(verifier).digest("base64url"),
        code_challenge_method: "S256",
      });
    expect(initial.status, JSON.stringify(initial.body)).toBe(200);
    const signedQuery = new URL(initial.body.url).search.slice(1);
    const login = await fixture
      .http()
      .post("/auth/sign-in/email")
      .set("Host", "localhost:40287")
      .set("Origin", WEB)
      .send({ email: "reader@example.com", password: "test-password-123", oauth_query: signedQuery });
    expect(login.status, JSON.stringify(login.body)).toBe(200);
    expect(login.body.url).toContain(`${WEB}/oauth/authorize?`);
    const modified = new URL(login.body.url);
    modified.searchParams.set("scope", "progress:write");
    const tampered = await fixture
      .http()
      .post("/auth/oauth2/consent")
      .set("Host", "localhost:40287")
      .set("Origin", WEB)
      .set("Cookie", fixture.cookie)
      .send({ accept: true, oauth_query: modified.search.slice(1) });
    expect(tampered.status).toBe(400);
    expect(fixture.data.oAuthConsent).toHaveLength(0);
  });

  it("allows public MCP registration without granting permissions and blocks machine grants", async () => {
    const registered = await fixture
      .http()
      .post("/auth/oauth2/register")
      .set("Host", "localhost:40287")
      .send({
        client_name: "MCP client",
        redirect_uris: ["http://127.0.0.1:6789/callback"],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
      });
    expect(registered.status, JSON.stringify(registered.body)).toBeLessThan(300);
    expect(registered.body.client_id).toBeTruthy();
    expect(registered.body.client_secret).toBeUndefined();
    expect(fixture.data.oAuthConsent).toHaveLength(0);
    const machine = await fixture
      .http()
      .post("/auth/oauth2/token")
      .set("Host", "localhost:40287")
      .type("form")
      .send({ grant_type: "client_credentials", client_id: registered.body.client_id, resource: fixture.urls.api });
    expect(machine.status).toBe(400);
  });

  it("rejects expired tokens, foreign issuers, ID tokens and modified signatures", async () => {
    const grant = await fixture.authorize("profile:read");
    const issued = await fixture.token(grant);
    const payload = {
      sub: fixture.data.user[0].id,
      azp: grant.client.client_id,
      scope: "profile:read",
      aud: fixture.urls.api,
      iss: `${ORIGIN}/auth`,
      trackgeekIssuedAt: Date.now(),
      exp: Math.floor(Date.now() / 1000) + 300,
    };
    for (const changes of [{ exp: 1 }, { iss: "https://other.example/auth" }, { trackgeekIssuedAt: undefined }]) {
      const signed = await fixture.auth.api.signJWT({ body: { payload: { ...payload, ...changes } } });
      const denied = await fixture.http().get("/integrations/v1/me").set("Authorization", `Bearer ${signed.token}`);
      expect(denied.status).toBe(401);
    }
    const parts = issued.body.access_token.split(".");
    parts[2] = `${parts[2][0] === "A" ? "B" : "A"}${parts[2].slice(1)}`;
    expect(
      (
        await fixture
          .http()
          .get("/integrations/v1/me")
          .set("Authorization", `Bearer ${parts.join(".")}`)
      ).status,
    ).toBe(401);
  });

  it("enforces scopes and ignores browser sessions as integration credentials", async () => {
    const grant = await fixture.authorize("library:read");
    const issued = await fixture.token(grant);
    const forbidden = await fixture
      .http()
      .post("/integrations/v1/progress/book")
      .set("Authorization", `Bearer ${issued.body.access_token}`)
      .send({ id: ID, pagesRead: 120 });
    expect(forbidden.status).toBe(403);
    expect(forbidden.headers["www-authenticate"]).toContain('scope="progress:write"');
    expect(fixture.progress.setBook).not.toHaveBeenCalled();
    const sessionOnly = await fixture
      .http()
      .get("/integrations/v1/library")
      .set("Cookie", fixture.cookie)
      .query({ type: "book" });
    expect(sessionOnly.status).toBe(401);
  });

  it("binds library queries to the connected user and rejects injected user IDs", async () => {
    const issued = await fixture.token(await fixture.authorize("library:read"));
    const response = await fixture
      .http()
      .get("/integrations/v1/library")
      .set("Authorization", `Bearer ${issued.body.access_token}`)
      .query({ type: "book" });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(fixture.media.getBookProgress).toHaveBeenCalledWith(
      expect.objectContaining({ userId: fixture.data.user[0].id }),
    );
    const injected = await fixture
      .http()
      .get("/integrations/v1/library")
      .set("Authorization", `Bearer ${issued.body.access_token}`)
      .query({ type: "book", userId: "someone-else" });
    expect(injected.status).toBe(422);
    expect(injected.body.error).toBe("invalid_input");
    expect(fixture.media.getBookProgress).toHaveBeenCalledTimes(1);
  });

  it("rejects tokens after consent removal, revocation or client disablement", async () => {
    const grant = await fixture.authorize("profile:read");
    const issued = await fixture.token(grant);
    const profile = () =>
      fixture.http().get("/integrations/v1/me").set("Authorization", `Bearer ${issued.body.access_token}`);
    const consent = fixture.data.oAuthConsent.pop()!;
    expect((await profile()).status).toBe(401);
    fixture.data.oAuthConsent.push(consent);
    fixture.revoke(new Date(Date.now() + 1));
    expect((await profile()).status).toBe(401);
  });

  it("serves MCP tools and rejects REST tokens, missing scopes and invalid input", async () => {
    const call = (body: object, accessToken?: string) => {
      const req = fixture
        .http()
        .post("/mcp")
        .set("Host", "localhost:40287")
        .set("Accept", "application/json, text/event-stream");
      if (accessToken) req.set("Authorization", `Bearer ${accessToken}`);
      return req.send(body);
    };
    const tools = await call({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(tools.status, JSON.stringify(tools.body)).toBe(200);
    expect(tools.body.result.tools.map((tool: { name: string }) => tool.name)).toContain("set_book_progress");
    const rest = await fixture.token(await fixture.authorize());
    expect((await call({ jsonrpc: "2.0", id: 2, method: "tools/list" }, rest.body.access_token)).status).toBe(401);
    const mcp = await fixture.token(await fixture.authorize("library:read", fixture.urls.mcp));
    const denied = await call(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "set_book_progress", arguments: { id: ID, pagesRead: 120 } },
      },
      mcp.body.access_token,
    );
    expect(denied.status).toBe(403);
    const invalid = await call(
      {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "get_my_library", arguments: { type: "book", userId: "someone-else" } },
      },
      mcp.body.access_token,
    );
    expect(invalid.body.result.isError).toBe(true);
    expect(fixture.media.getBookProgress).not.toHaveBeenCalled();
    const valid = await call(
      { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "get_my_library", arguments: { type: "book" } } },
      mcp.body.access_token,
    );
    expect(valid.body.result.isError).not.toBe(true);
    expect(valid.body.result.structuredContent.result.items).toEqual([]);
  });
});
