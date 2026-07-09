import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import {
  CreateCommentNotificationDto,
  CreateReactionNotificationDto,
  CreateSystemNotificationDto,
} from "@/modules/notification/dto/notification.dto";
import { NotificationService } from "@/modules/notification/service/notification.service";
import { NOTIFICATION_COMMENT_JOB, NOTIFICATION_REACTION_JOB, NOTIFICATION_SYSTEM_JOB } from "@/shared/constants/job";
import { NOTIFICATION_QUEUE } from "@/shared/constants/queue";

export type CommentNotificationJobData = CreateCommentNotificationDto;

export type ReactionNotificationJobData = CreateReactionNotificationDto;

export type SystemNotificationJobData = CreateSystemNotificationDto;

@Processor(NOTIFICATION_QUEUE, { concurrency: 10 })
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async process(job: Job) {
    if (job.name === NOTIFICATION_SYSTEM_JOB) {
      await this.notificationService.createSystemNotification(job.data as SystemNotificationJobData);

      return;
    }

    if (job.name === NOTIFICATION_COMMENT_JOB) {
      await this.notificationService.createFromComment(job.data as CommentNotificationJobData);

      return;
    }

    if (job.name === NOTIFICATION_REACTION_JOB) {
      await this.notificationService.createFromReaction(job.data as ReactionNotificationJobData);

      return;
    }

    throw new Error(`Unsupported notification job name: ${job.name}`);
  }

  @OnWorkerEvent("active")
  onActive(job: Job) {
    this.logger.log(
      `Processing job [${NOTIFICATION_QUEUE}] | job=${job.id} name=${job.name} attempt=${job.attemptsMade + 1}`,
    );
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    this.logger.log(`Job completed [${NOTIFICATION_QUEUE}] | job=${job.id} name=${job.name}`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    if (!job) return;

    const maxAttempts = job.opts?.attempts ?? 1;
    const willRetry = job.attemptsMade < maxAttempts;

    if (willRetry) {
      this.logger.warn(
        `Job failed, retrying [${NOTIFICATION_QUEUE}] | job=${job.id} name=${job.name} attempt=${job.attemptsMade}/${maxAttempts} error=${error.message}`,
      );
    } else {
      this.logger.error(
        `Job removed from queue after max attempts [${NOTIFICATION_QUEUE}] | job=${job.id} name=${job.name} attempts=${job.attemptsMade}/${maxAttempts} error=${error.message}`,
      );
    }
  }
}
