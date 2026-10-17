import { HttpException } from "@nestjs/common";

export class OAuthAccessException extends HttpException {
  constructor(
    readonly error: "invalid_token" | "insufficient_scope",
    readonly scopes: string[] = [],
  ) {
    super({ error }, error === "invalid_token" ? 401 : 403);
  }
}
