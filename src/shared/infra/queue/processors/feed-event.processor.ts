import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";

import { FeedEventService } from "@/modules/feed-event/feed-event.service";
import { FEED_EVENT_QUEUE } from "@/shared/constants/queue";
import { FEED_EVENT_FLUSH_AGGREGATION_JOB, FEED_EVENT_JOB } from '@/shared/constants/job';
import { FeedEventDto, FeedEventMetadata } from '@/modules/feed-event/dtos/feed-event.dto';
import { QueueService } from '../queue.service';
import { CacheService } from '../../cache/cache.service';

export type FeedEventJobData = FeedEventDto

export interface FeedEventFlushAggregationJobData {
  aggKey: string;
}

@Processor(FEED_EVENT_QUEUE, { concurrency: 10 })
export class FeedEventProcessor extends WorkerHost {
  private readonly logger = new Logger(FeedEventProcessor.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly feedEventService: FeedEventService,
    private readonly cacheService: CacheService,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name === FEED_EVENT_JOB) {
      const { type, userId, metadata } = job.data as FeedEventJobData;
    
      const aggKey = `feed:agg:${userId}:${type}`;
      const lockKey = `${aggKey}:lock`;
      
      await this.cacheService.redis.lPush(aggKey, JSON.stringify({ userId, type, metadata }));
      await this.cacheService.redis.expire(aggKey, 600); // 10 minutos
      
      const windowsMs = 5 * 60 * 1000; // 5 minutos
      
      const isLeader = await this.cacheService.redis.set(lockKey, '1', { NX: true, PX: windowsMs });
      
      if (isLeader) {
        await this.queueService.toFeedEventFlushAggregationJob(
          { aggKey },
          { delay: windowsMs },
        );
        
        this.logger.log(`Aggregation window opened: ${aggKey}`);
      }
      
      return;
    }
    
    if (job.name === FEED_EVENT_FLUSH_AGGREGATION_JOB) {
      const { aggKey } = job.data as FeedEventFlushAggregationJobData;
      
      const raw = await this.cacheService.redis.lRange(aggKey, 0, -1);
      
      await this.cacheService.redis.del(aggKey);
      
      if (!raw.length) return;
      
      const events = raw.map<FeedEventDto>(r => JSON.parse(r));
      
      const first = events[0];
      
      const entityIds = events
        .map(e => (e.metadata as FeedEventMetadata)?.id)
        .filter(Boolean);

      await this.feedEventService.createFeedEvent({
        type: first.type,
        userId: first.userId,
        count: events.length,
        entityIds,
        metadata: {
          ...(
            events.length === 1 
              ? first.metadata as FeedEventMetadata
              : events.map(e => e.metadata) as FeedEventMetadata[]
          )
        },
      });
      
      return
    }
    
    throw new Error(`Unsupported feed event job name: ${job.name}`);
  }

  @OnWorkerEvent("active")
  onActive(job: Job) {
    this.logger.log(
      `Processing job [${FEED_EVENT_QUEUE}] | job=${job.id} name=${job.name} attempt=${job.attemptsMade + 1}`,
    );
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    this.logger.log(`Job completed [${FEED_EVENT_QUEUE}] | job=${job.id} name=${job.name}`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    if (!job) return;

    const maxAttempts = job.opts?.attempts ?? 1;
    const willRetry = job.attemptsMade < maxAttempts;

    if (willRetry) {
      this.logger.warn(
        `Job failed, retrying [${FEED_EVENT_QUEUE}] | job=${job.id} name=${job.name} attempt=${job.attemptsMade}/${maxAttempts} error=${error.message}`,
      );
    } else {
      this.logger.error(
        `Job removed from queue after max attempts [${FEED_EVENT_QUEUE}] | job=${job.id} name=${job.name} attempts=${job.attemptsMade}/${maxAttempts} error=${error.message}`,
      );
    }
  }
}
