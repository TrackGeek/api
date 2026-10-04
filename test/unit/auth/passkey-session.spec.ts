import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { describe, expect, it } from "vitest";
import { getAuthConfig } from "@/modules/auth/config/auth.config";

async function setup() {
  const database: Record<string, any[]> = { user: [], session: [], account: [], verification: [], passkey: [] };
  const config = getAuthConfig({
    configService: { get: () => undefined } as any,
    databaseService: {} as any,
  });
  const auth = betterAuth({
    baseURL: "http://localhost:3000",
    secret: "passkey-session-test-secret-at-least-32-characters",
    database: memoryAdapter(database),
    emailAndPassword: { enabled: true },
    plugins: [passkey({ rpID: "localhost", origin: "http://localhost:3000" })],
    hooks: config.hooks,
  });
  const result = await auth.api.signUpEmail({
    body: { email: "passkey@example.com", password: "test-password-123", name: "Passkey User" },
    returnHeaders: true,
  });
  const headers = new Headers({ cookie: result.headers.get("set-cookie")!.split(";")[0] });
  database.session[0].createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  return { auth, headers };
}

describe("Passkey registration session freshness", () => {
  it("generates registration options for an old authenticated session", async () => {
    const { auth, headers } = await setup();

    await expect(auth.api.generatePasskeyRegistrationOptions({ headers })).resolves.toMatchObject({
      challenge: expect.any(String),
    });
  });

  it("reaches challenge validation with an old authenticated session", async () => {
    const { auth, headers } = await setup();

    await expect(auth.api.verifyPasskeyRegistration({ headers, body: { response: {} } })).rejects.toMatchObject({
      body: { code: "CHALLENGE_NOT_FOUND" },
    });
  });

  it("rejects unauthenticated registration options", async () => {
    const { auth } = await setup();

    await expect(auth.api.generatePasskeyRegistrationOptions({ headers: new Headers() })).rejects.toMatchObject({
      body: { code: "UNAUTHORIZED" },
    });
  });

  it("rejects unauthenticated registration verification", async () => {
    const { auth } = await setup();

    await expect(
      auth.api.verifyPasskeyRegistration({ headers: new Headers(), body: { response: {} } }),
    ).rejects.toMatchObject({ body: { code: "UNAUTHORIZED" } });
  });

  it("preserves freshness checks for other requests on the same auth instance", async () => {
    const { auth, headers } = await setup();
    const context = await auth.$context;

    const results = await Promise.allSettled([
      auth.api.generatePasskeyRegistrationOptions({ headers }),
      auth.api.listSessions({ headers }),
    ]);

    expect(results[0].status).toBe("fulfilled");
    expect(results[1]).toMatchObject({ status: "rejected", reason: { body: { code: "SESSION_NOT_FRESH" } } });
    expect(context.sessionConfig.freshAge).toBe(24 * 60 * 60);
    await expect(auth.api.listSessions({ headers })).rejects.toMatchObject({
      body: { code: "SESSION_NOT_FRESH" },
    });
  });
});
