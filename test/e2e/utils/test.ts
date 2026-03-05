import { test as base, request as pwRequest, type APIRequestContext } from "@playwright/test";

export const test = base.extend<{}, { api: APIRequestContext }>({
  api: [
    async ({}, use) => {
      const api = await pwRequest.newContext({ baseURL: `http://localhost:${process.env.PORT}` });

      try {
        await use(api);
      } finally {
        await api.dispose();
      }
    },
    { scope: "worker" },
  ],
});
