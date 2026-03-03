import { generateUserCredentials, signIn, signUp } from "./utils/auth";
import { test } from './utils/test';

test.describe("Auth", () => {
  let authToken: string;
  let authCredentials: ReturnType<typeof generateUserCredentials>;

  test.beforeAll(async ({ api }) => {
    authCredentials = generateUserCredentials();
    
    const response = await api.post('/signup', { data: authCredentials });
    const body = await response.json();
    
    authToken = body.token;
  });

  test("POST /auth/sign-up/email - should create a new user", async ({ api }) => {
    const newCredentials = generateUserCredentials();
    const response = await signUp(api, newCredentials);

    expect(response.status()).toBe(200);
  });

  test("POST /auth/sign-in/email - should return a token when signing in", async ({ api }) => {
    const response = await signIn(api, authCredentials);
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body).toHaveProperty("token");
  });

  test("GET /auth/get-session - should return the current session", async ({ api }) => {
    const response = await api.get("/auth/get-session", {
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
