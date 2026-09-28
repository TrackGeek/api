import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger, OnModuleInit } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { AccountInactivityService } from "./account-inactivity.service";

export const ACCOUNT_INACTIVITY_QUEUE = "account-inactivity";
const DAILY_JOB = "account-inactivity-daily";

@Processor(ACCOUNT_INACTIVITY_QUEUE, { concurrency: 1 })
export class AccountInactivityProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(AccountInactivityProcessor.name);

  constructor(
    @InjectQueue(ACCOUNT_INACTIVITY_QUEUE) private readonly queue: Queue,
    private readonly service: AccountInactivityService,
  ) {
    super();
  }

  async onModuleInit() {
    await this.queue.upsertJobScheduler(DAILY_JOB, { pattern: "0 6 * * *", tz: "UTC" }, { name: DAILY_JOB, data: {} });
  }

  async process(job: Job) {
    if (job.name !== DAILY_JOB) throw new Error(`Unsupported inactivity job: ${job.name}`);
    await this.service.run();
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(`Account inactivity job failed | job=${job?.id} error=${error.message}`);
  }
}
