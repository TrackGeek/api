import { Dataxamas, type DataxamasCrawlers } from "@dataxamas/tracker-js";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type DataxamasLogLevel = "info" | "warn" | "debug";

@Injectable()
export class DataxamasService {
  private readonly client?: Dataxamas;

  private readonly pending = new Set<Promise<void>>();

  constructor(configService: ConfigService) {
    const apiKey = configService.get<string>("DATAXAMAS_API_KEY")?.trim();

    if (apiKey) {
      this.client = new Dataxamas({
        apiKey,
        environment: configService.get<string>("NODE_ENV"),
        captureGlobalErrors: false,
      });
    }
  }

  get enabled(): boolean {
    return this.client !== undefined;
  }

  get crawlers(): DataxamasCrawlers | undefined {
    return this.client?.crawlers;
  }

  log(level: DataxamasLogLevel, message: string, data?: unknown): void {
    this.track(() => this.client?.logs[level](message, data));
  }

  captureException(error: unknown, context?: unknown): void {
    this.track(() => this.client?.exceptions.captureException(error, context));
  }

  async flush(timeoutMs = 3000): Promise<void> {
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs).unref());

    await Promise.race([Promise.allSettled(this.pending), timeout]);
  }

  private track(send: () => Promise<void> | undefined): void {
    let promise: Promise<void> | undefined;

    try {
      promise = send();
    } catch {
      return;
    }

    if (!promise) return;

    this.pending.add(promise);

    void promise.finally(() => this.pending.delete(promise));
  }
}
