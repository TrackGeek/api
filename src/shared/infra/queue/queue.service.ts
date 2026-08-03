import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JobsOptions, Queue } from "bullmq";
import { CreateActivityDto } from "@/modules/activity/dto/activity.dto";
import { SyncWatchedActivityDto } from "@/modules/activity/dto/sync-watched-activity.dto";
import {
  CreateCommentNotificationDto,
  CreateReactionNotificationDto,
  CreateSystemNotificationDto,
} from "@/modules/notification/dto/notification.dto";
import {
  ACTIVITY_JOB,
  CATCHUP_DAILY_JOB,
  CATCHUP_DAILY_SCHEDULER_ID,
  MAGIC_LINK_JOB,
  NOTIFICATION_COMMENT_JOB,
  NOTIFICATION_REACTION_JOB,
  NOTIFICATION_SYSTEM_JOB,
  PAYMENT_FAILED_JOB,
  PAYMENT_SUCCESS_JOB,
  RESET_PASSWORD_JOB,
  SUBSCRIPTION_CANCELLED_JOB,
  WATCHED_ACTIVITY_JOB,
} from "@/shared/constants/job";
import { ACTIVITY_QUEUE, CATCHUP_QUEUE, EMAIL_QUEUE, NOTIFICATION_QUEUE } from "@/shared/constants/queue";
import { MagicLinkEmailDto } from "../email/dto/magic-link-email.dto";
import { PaymentFailedEmailDto } from "../email/dto/payment-failed-email.dto";
import { PaymentSuccessEmailDto } from "../email/dto/payment-success-email.dto";
import { ResetPasswordEmailDto } from "../email/dto/reset-password-email.dto";
import { SubscriptionCancelledEmailDto } from "../email/dto/subscription-cancelled-email.dto";

type QueueName = typeof EMAIL_QUEUE | typeof ACTIVITY_QUEUE | typeof NOTIFICATION_QUEUE | typeof CATCHUP_QUEUE;

type JobName =
  | typeof ACTIVITY_JOB
  | typeof WATCHED_ACTIVITY_JOB
  | typeof NOTIFICATION_SYSTEM_JOB
  | typeof NOTIFICATION_COMMENT_JOB
  | typeof NOTIFICATION_REACTION_JOB
  | typeof MAGIC_LINK_JOB
  | typeof RESET_PASSWORD_JOB
  | typeof PAYMENT_SUCCESS_JOB
  | typeof PAYMENT_FAILED_JOB
  | typeof SUBSCRIPTION_CANCELLED_JOB
  | typeof CATCHUP_DAILY_JOB;

const DEFAULT_CATCHUP_CRON = "0 4 * * *";

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue(EMAIL_QUEUE)
    private readonly emailQueue: Queue,
    @InjectQueue(ACTIVITY_QUEUE)
    private readonly activityQueue: Queue,
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue,
    @InjectQueue(CATCHUP_QUEUE)
    private readonly catchupQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.scheduleDailyCatchup();
  }

  async scheduleDailyCatchup() {
    const pattern = this.configService.get<string>("CATCHUP_CRON") ?? DEFAULT_CATCHUP_CRON;
    const tz = this.configService.get<string>("CATCHUP_TIMEZONE") ?? "UTC";

    try {
      await this.catchupQueue.upsertJobScheduler(
        CATCHUP_DAILY_SCHEDULER_ID,
        { pattern, tz },
        { name: CATCHUP_DAILY_JOB, data: {} },
      );

      this.logger.log(`Daily catch-up scheduler registered | pattern=${pattern} tz=${tz}`);
    } catch (error: any) {
      this.logger.error(`Failed to register daily catch-up scheduler | error=${error.message}`);
    }
  }

  async toCatchupDailyJob(runDate?: string) {
    await this.addJob(CATCHUP_QUEUE, CATCHUP_DAILY_JOB, { runDate });
  }

  private async addJob(queueName: QueueName, jobName: JobName, data: unknown, options?: JobsOptions) {
    try {
      const queues = {
        [EMAIL_QUEUE]: this.emailQueue,
        [ACTIVITY_QUEUE]: this.activityQueue,
        [NOTIFICATION_QUEUE]: this.notificationQueue,
        [CATCHUP_QUEUE]: this.catchupQueue,
      } as const;

      const job = await queues[queueName].add(jobName, data, options);

      this.logger.log(`Job added to queue [${queueName}] | job=${job.id} name=${jobName}`);
    } catch (error: any) {
      this.logger.error(`Failed to add job to queue [${queueName}] | error=${error.message}`);
    }
  }

  async toActivityJob(createActivityDto: CreateActivityDto) {
    await this.addJob(ACTIVITY_QUEUE, ACTIVITY_JOB, createActivityDto);
  }

  async toWatchedActivityJob(syncWatchedActivityDto: SyncWatchedActivityDto) {
    await this.addJob(ACTIVITY_QUEUE, WATCHED_ACTIVITY_JOB, syncWatchedActivityDto);
  }

  async toSystemNotificationJob(createSystemNotificationDto: CreateSystemNotificationDto) {
    await this.addJob(NOTIFICATION_QUEUE, NOTIFICATION_SYSTEM_JOB, createSystemNotificationDto);
  }

  async toCommentNotificationJob(createCommentNotificationDto: CreateCommentNotificationDto) {
    await this.addJob(NOTIFICATION_QUEUE, NOTIFICATION_COMMENT_JOB, createCommentNotificationDto);
  }

  async toReactionNotificationJob(createReactionNotificationDto: CreateReactionNotificationDto) {
    await this.addJob(NOTIFICATION_QUEUE, NOTIFICATION_REACTION_JOB, createReactionNotificationDto);
  }

  async toMagicLinkJob(magicLinkEmailDto: MagicLinkEmailDto) {
    await this.addJob(EMAIL_QUEUE, MAGIC_LINK_JOB, magicLinkEmailDto);
  }

  async toResetPasswordJob(resetPasswordEmailDto: ResetPasswordEmailDto) {
    await this.addJob(EMAIL_QUEUE, RESET_PASSWORD_JOB, resetPasswordEmailDto);
  }

  async toPaymentSuccessJob(paymentSuccessEmailDto: PaymentSuccessEmailDto) {
    await this.addJob(EMAIL_QUEUE, PAYMENT_SUCCESS_JOB, paymentSuccessEmailDto);
  }

  async toPaymentFailedJob(paymentFailedEmailDto: PaymentFailedEmailDto) {
    await this.addJob(EMAIL_QUEUE, PAYMENT_FAILED_JOB, paymentFailedEmailDto);
  }

  async toSubscriptionCancelledJob(subscriptionCancelledEmailDto: SubscriptionCancelledEmailDto) {
    await this.addJob(EMAIL_QUEUE, SUBSCRIPTION_CANCELLED_JOB, subscriptionCancelledEmailDto);
  }
}
