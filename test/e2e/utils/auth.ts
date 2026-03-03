import { faker } from "@faker-js/faker";
import type { APIRequestContext, APIResponse } from "@playwright/test";

export function generateUserCredentials() {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    password: faker.internet.password({ length: 12 }),
  };
}

export async function signUp(
  api: APIRequestContext,
  credentials: ReturnType<typeof generateUserCredentials>,
): Promise<APIResponse> {
  const response = await api.post("/auth/sign-up/email", {
    data: {
      ...credentials,
      rememberMe: false,
    },
  });

  return response;
}

export async function signIn(
  api: APIRequestContext,
  credentials: Pick<ReturnType<typeof generateUserCredentials>, "email" | "password">,
): Promise<APIResponse> {
  const response = await api.post("/auth/sign-in/email", {
    data: {
      email: credentials.email,
      password: credentials.password,
      rememberMe: false,
    },
  });

  return response;
}
