import { Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { CatchupAuditAction } from "../constants/catchup.constants";

@Injectable()
export class CatchupAuditService {
  private readonly logger = new Logger(CatchupAuditService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async record(action: CatchupAuditAction, metadata: Record<string, unknown> = {}, runId: string | null = null) {
    try {
      await this.databaseService.catchupAuditLog.create({
        data: { action, runId, metadata: metadata as any },
      });
    } catch (error: any) {
      this.logger.error(`Failed to record catch-up audit log | action=${action} error=${error.message}`);
    }
  }
}
