import { Module } from "@nestjs/common";
import { TrackingIntegrationsModule } from "@/modules/integrations/integrations.module";
import { McpController } from "./controller/mcp.controller";
import { McpServerService } from "./service/mcp-server.service";

@Module({
  imports: [TrackingIntegrationsModule],
  controllers: [McpController],
  providers: [McpServerService],
})
export class McpModule {}
