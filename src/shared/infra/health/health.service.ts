import { Injectable } from "@nestjs/common";
import { DatabaseService } from "@/shared/infra/database/database.service";

@Injectable()
export class HealthService {
  constructor(private readonly databaseService: DatabaseService) {}

  async check() {
    const apiStart = performance.now();

    let dbLatencyMs: number | null = null;
    let dbStatus: "ok" | "error" = "ok";

    try {
      const dbStart = performance.now();

      await this.databaseService.$queryRaw`SELECT 1`;

      dbLatencyMs = Math.round(performance.now() - dbStart);
    } catch {
      dbStatus = "error";
    }

    const apiLatencyMs = Math.round(performance.now() - apiStart);

    return {
      status: dbStatus === "ok" ? "ok" : "degraded",
      api: {
        status: "ok",
        latencyMs: apiLatencyMs,
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
    };
  }
}
