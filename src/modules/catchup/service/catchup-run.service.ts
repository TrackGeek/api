import { Injectable } from "@nestjs/common";
import { CatchupRunStatus } from "@prisma/generated/enums";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { CatchupRunStats } from "../types/catchup.types";

@Injectable()
export class CatchupRunService {
  constructor(private readonly databaseService: DatabaseService) {}

  async start(runDate: Date) {
    return this.databaseService.catchupRun.create({
      data: { runDate, status: CatchupRunStatus.Running },
    });
  }

  async finishSuccess(runId: string, stats: CatchupRunStats) {
    return this.databaseService.catchupRun.update({
      where: { id: runId },
      data: {
        status: CatchupRunStatus.Success,
        stats: stats as any,
        finishedAt: new Date(),
      },
    });
  }

  async finishFailure(runId: string, error: unknown, stats: CatchupRunStats) {
    const message = error instanceof Error ? error.message : String(error);

    return this.databaseService.catchupRun.update({
      where: { id: runId },
      data: {
        status: CatchupRunStatus.Failed,
        stats: stats as any,
        error: message,
        finishedAt: new Date(),
      },
    });
  }

  async getLastRuns(limit = 20) {
    return this.databaseService.catchupRun.findMany({
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  }
}
