import { test as base, request as pwRequest } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

export const test = base.extend<{}, { api: APIRequestContext }>({
  api: [async ({}, use) => {
    const api = await pwRequest.newContext({ baseURL: process.env.API_BASE_URL });
    
    await use(api);
    
    await api.dispose();
  }, { scope: 'worker' }],
});