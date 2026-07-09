import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { JobsOptions, Queue } from "bullmq";
import { CreateActivityDto } from "@/modules/activity/dto/activity.dto";
import {
  CreateCommentNotificationDto,
  CreateReactionNotificationDto,
  CreateSystemNotificationDto,
} from "@/modules/notification/dto/notification.dto";
import {
  ACTIVITY_JOB,
  MAGIC_LINK_JOB,
  NOTIFICATION_COMMENT_JOB,
  NOTIFICATION_REACTION_JOB,
  NOTIFICATION_SYSTEM_JOB,
  PAYMENT_FAILED_JOB,
  PAYMENT_SUCCESS_JOB,
  RESET_PASSWORD_JOB,
  SUBSCRIPTION_CANCELLED_JOB,
} from "@/shared/constants/job";
import { ACTIVITY_QUEUE, EMAIL_QUEUE, NOTIFICATION_QUEUE } from "@/shared/constants/queue";
import { MagicLinkEmailDto } from "../email/dto/magic-link-email.dto";
import { PaymentFailedEmailDto } from "../email/dto/payment-failed-email.dto";
import { PaymentSuccessEmailDto } from "../email/dto/payment-success-email.dto";
import { ResetPasswordEmailDto } from "../email/dto/reset-password-email.dto";
import { SubscriptionCancelledEmailDto } from "../email/dto/subscription-cancelled-email.dto";

type QueueName = typeof EMAIL_QUEUE | typeof ACTIVITY_QUEUE | typeof NOTIFICATION_QUEUE;

type JobName =
  | typeof ACTIVITY_JOB
  | typeof NOTIFICATION_SYSTEM_JOB
  | typeof NOTIFICATION_COMMENT_JOB
  | typeof NOTIFICATION_REACTION_JOB
  | typeof MAGIC_LINK_JOB
  | typeof RESET_PASSWORD_JOB
  | typeof PAYMENT_SUCCESS_JOB
  | typeof PAYMENT_FAILED_JOB
  | typeof SUBSCRIPTION_CANCELLED_JOB;

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(EMAIL_QUEUE)
    private readonly emailQueue: Queue,
    @InjectQueue(ACTIVITY_QUEUE)
    private readonly activityQueue: Queue,
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue,
  ) {}

  private async addJob(queueName: QueueName, jobName: JobName, data: unknown, options?: JobsOptions) {
    try {
      const queues = {
        [EMAIL_QUEUE]: this.emailQueue,
        [ACTIVITY_QUEUE]: this.activityQueue,
        [NOTIFICATION_QUEUE]: this.notificationQueue,
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
