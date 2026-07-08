import { type APIRequestContext, test as base, request as pwRequest } from "@playwright/test";

export const test = base.extend<any, { api: APIRequestContext }>({
  api: [
    async (_, use) => {
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
