import { createHash } from "node:crypto";

export function hashOAuthToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}
