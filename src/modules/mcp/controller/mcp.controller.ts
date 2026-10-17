import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { All, Controller, Req, Res, UseFilters, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiExcludeController } from "@nestjs/swagger";
import type { Response } from "express";
import { getOAuthUrls } from "@/modules/auth/config/oauth.config";
import { IntegrationExceptionFilter } from "@/modules/integrations/filters/integration-exception.filter";
import { IntegrationGuard } from "@/modules/integrations/guards/integration.guard";
import type { IntegrationRequest } from "@/modules/integrations/types/integration-request";
import { McpServerService } from "../service/mcp-server.service";

@ApiExcludeController()
@Controller("/mcp")
@UseGuards(IntegrationGuard)
@UseFilters(IntegrationExceptionFilter)
export class McpController {
  constructor(
    private readonly servers: McpServerService,
    private readonly config: ConfigService,
  ) {}

  @All()
  async handle(@Req() request: IntegrationRequest, @Res() response: Response) {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      response.status(405).json({ error: "method_not_allowed" });
      return;
    }
    const urls = getOAuthUrls(this.config);
    const origins = [
      this.config.get<string>("WEB_URL"),
      ...(this.config.get<string>("MCP_ALLOWED_ORIGINS") ?? "").split(","),
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.trim());
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      enableDnsRebindingProtection: true,
      allowedHosts: [new URL(urls.mcp).host],
      allowedOrigins: origins,
    });
    const server = this.servers.create(request.integrationPrincipal, request.ip ?? "unknown");
    response.on("close", () => {
      void server.close().catch(() => undefined);
    });
    await server.connect(transport);
    await transport.handleRequest(request, response, request.body);
  }
}
