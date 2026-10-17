import type { oauthProvider } from "@better-auth/oauth-provider";
import type { betterAuth } from "better-auth";
import type { jwt } from "better-auth/plugins";

export type TrackGeekAuth = ReturnType<
  typeof betterAuth<{
    plugins: [ReturnType<typeof jwt>, ReturnType<typeof oauthProvider>];
  }>
>;
