import { type ArgumentsHost, Catch, HttpException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { getOAuthUrls } from "@/modules/auth/config/oauth.config";
import { OAuthAccessException } from "@/modules/oauth/exceptions/oauth-access.exception";
import { HttpExceptionFilter } from "@/shared/filters/http-exception.filter";
import { getIntegrationError } from "../utils/get-integration-error";

@Catch()
export class IntegrationExceptionFilter extends HttpExceptionFilter {
  constructor(private readonly config: ConfigService) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost) {
    if (!(exception instanceof HttpException)) return super.catch(exception, host);
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    if (!(exception instanceof OAuthAccessException)) {
      if (exception.getStatus() === 429) response.setHeader("Retry-After", "60");
      return response.status(exception.getStatus()).json(getIntegrationError(exception));
    }
    const urls = getOAuthUrls(this.config);
    const metadata = request.path.startsWith("/mcp") ? urls.metadata : `${urls.metadata}/integrations/v1`;
    const scope = exception.scopes.length ? `, scope="${exception.scopes.join(" ")}"` : "";
    response.setHeader(
      "WWW-Authenticate",
      `Bearer resource_metadata="${metadata}", error="${exception.error}"${scope}`,
    );
    return response.status(exception.getStatus()).json({ error: exception.error });
  }
}
