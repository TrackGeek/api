import { test, expect } from "@playwright/test";
import { generateUserCredentials, signIn, signUp } from "./utils/auth.utils";

test.describe("Auth", () => {
  let authToken: string;
  let authCredentials: ReturnType<typeof generateUserCredentials>;

  test.beforeAll(async ({ request }) => {
    authCredentials = generateUserCredentials();

    const response = await signUp(request, authCredentials);
    const body = await response.json();

    authToken = body.token;
  });

  test("POST /auth/sign-up/email - should create a new user", async ({ request }) => {
    const newCredentials = generateUserCredentials();
    const response = await signUp(request, newCredentials);

    expect(response.status()).toBe(200);
  });

  test("POST /auth/sign-in/email - should return a token when signing in", async ({ request }) => {
    const response = await signIn(request, authCredentials);
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body).toHaveProperty("token");
  });

  test("GET /auth/get-session - should return the current session", async ({ request }) => {
    const response = await request.get("/auth/get-session", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body).toHaveProperty("user");
    expect(body.user).toHaveProperty("email", authCredentials.email);
  });
});
