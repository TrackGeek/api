import type { Request } from "express";
import type { OAuthPrincipal } from "@/modules/oauth/types/oauth-principal";

export interface IntegrationRequest extends Request {
  integrationPrincipal: OAuthPrincipal | null;
}
