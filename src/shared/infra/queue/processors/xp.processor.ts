import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { ActivityType, CoinReason, NotificationType, XpReason } from "@prisma/generated/enums";
import { Job } from "bullmq";
import { CoinService } from "@/modules/coin/service/coin.service";
import { CompletedMission, MissionService } from "@/modules/mission/service/mission.service";
import { NotificationService } from "@/modules/notification/service/notification.service";
import { GrantXpDto } from "@/modules/xp/dto/grant-xp.dto";
import { XpService } from "@/modules/xp/service/xp.service";
import { XP_JOB } from "@/shared/constants/job";
import { XP_QUEUE } from "@/shared/constants/queue";
import { COINS_PER_LEVEL, XP_SOURCE_KEYS } from "@/shared/constants/xp";
import { QueueService } from "../queue.service";

export type XpJobData = GrantXpDto;

// Orquestra tudo que acontece em volta de uma concessão de XP: missões, coins,
// medalhas, activity, notificação e streak. Os services continuam puros (só
// DatabaseService), o que evita dependência circular com o QueueModule.
@Processor(XP_QUEUE, { concurrency: 5 })
export class XpProcessor extends WorkerHost {
  private readonly logger = new Logger(XpProcessor.name);

  constructor(
    private readonly xpService: XpService,
    private readonly missionService: MissionService,
    private readonly coinService: CoinService,
    private readonly notificationService: NotificationService,
    private readonly queueService: QueueService,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name !== XP_JOB) {
      throw new Error(`Unsupported xp job name: ${job.name}`);
    }

    const data = job.data as XpJobData;
    const result = await this.xpService.grantXp(data);

    // null = sourceKey repetido ou teto diário esgotado. Nada aconteceu, nada
    // pra propagar (nem missão, nem streak).
    if (!result) return;

    const completed = await this.missionService.advanceForXpReason(data.userId, result.reason, result.contentType);

    if (result.leveledUp) {
      await this.handleLevelUp(data.userId, result.previousLevel, result.level, result.totalXp);

      completed.push(...(await this.missionService.advanceLevelReached(data.userId)));
    }

    for (const entry of completed) {
      await this.handleMissionCompleted(data.userId, entry);
    }

    // StreakBonus é ele próprio uma concessão de XP: reentrar aqui viraria laço.
    if (data.reason !== XpReason.StreakBonus) {
      const streak = await this.xpService.touchStreak(data.userId);

      if (streak) {
        await this.queueService.toXpJob({
          userId: data.userId,
          reason: XpReason.StreakBonus,
          sourceKey: XP_SOURCE_KEYS.streak(streak.dayKey),
          amount: streak.bonusXp,
          metadata: { currentStreak: streak.currentStreak },
        });
      }
    }
  }

  private async handleLevelUp(userId: string, previousLevel: number, level: number, totalXp: number) {
    // Um salto pode cruzar mais de um level de uma vez; cada um paga o seu.
    for (let crossed = previousLevel + 1; crossed <= level; crossed++) {
      await this.coinService.grantCoins({
        userId,
        reason: CoinReason.LevelUp,
        sourceKey: XP_SOURCE_KEYS.levelUp(crossed),
        amount: COINS_PER_LEVEL * crossed,
        metadata: { level: crossed },
      });
    }

    const medals = await this.xpService.grantMilestoneMedals(userId, previousLevel, level);

    for (const { userMedal, medal } of medals) {
      await this.queueService.toActivityJob({
        type: ActivityType.MedalEarned,
        userId,
        userMedalId: userMedal.id,
        metadata: { id: medal.id, name: medal.name },
      });
    }

    await this.queueService.toActivityJob({
      type: ActivityType.LevelUp,
      userId,
      metadata: { id: XP_SOURCE_KEYS.levelUp(level), level, previousLevel, totalXp },
    });

    await this.notificationService.createProgressionNotification({
      recipientId: userId,
      type: NotificationType.LevelUp,
      metadata: {
        titleKey: "notifications:levelUp.title",
        descriptionKey: "notifications:levelUp.description",
        level,
        previousLevel,
      },
    });
  }

  private async handleMissionCompleted(userId: string, { mission, userMission }: CompletedMission) {
    if (mission.xpReward > 0) {
      await this.queueService.toXpJob({
        userId,
        reason: XpReason.MissionCompleted,
        sourceKey: XP_SOURCE_KEYS.mission(mission.id),
        amount: mission.xpReward,
        metadata: { missionKey: mission.key },
      });
    }

    await this.coinService.grantCoins({
      userId,
      reason: CoinReason.MissionCompleted,
      sourceKey: XP_SOURCE_KEYS.mission(mission.id),
      amount: mission.coinReward,
      metadata: { missionKey: mission.key },
    });

    if (mission.medalId) {
      await this.grantMissionMedal(userId, mission.medalId);
    }

    await this.queueService.toActivityJob({
      type: ActivityType.MissionCompleted,
      userId,
      metadata: { id: userMission.id, missionId: mission.id, missionKey: mission.key, tier: mission.tier },
    });

    await this.notificationService.createProgressionNotification({
      recipientId: userId,
      type: NotificationType.MissionCompleted,
      metadata: {
        titleKey: "notifications:missionCompleted.title",
        descriptionKey: "notifications:missionCompleted.description",
        missionKey: mission.key,
        tier: mission.tier,
      },
    });
  }

  private async grantMissionMedal(userId: string, medalId: string) {
    const userMedal = await this.xpService.grantMedal(userId, medalId);

    if (!userMedal) return;

    await this.queueService.toActivityJob({
      type: ActivityType.MedalEarned,
      userId,
      userMedalId: userMedal.id,
      metadata: { id: medalId },
    });
  }

  @OnWorkerEvent("active")
  onActive(job: Job) {
    this.logger.log(`Processing job [${XP_QUEUE}] | job=${job.id} name=${job.name} attempt=${job.attemptsMade + 1}`);
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    this.logger.log(`Job completed [${XP_QUEUE}] | job=${job.id} name=${job.name}`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    if (!job) return;

    const maxAttempts = job.opts?.attempts ?? 1;
    const willRetry = job.attemptsMade < maxAttempts;

    if (willRetry) {
      this.logger.warn(
        `Job failed, retrying [${XP_QUEUE}] | job=${job.id} name=${job.name} attempt=${job.attemptsMade}/${maxAttempts} error=${error.message}`,
      );
    } else {
      this.logger.error(
        `Job removed from queue after max attempts [${XP_QUEUE}] | job=${job.id} name=${job.name} attempts=${job.attemptsMade}/${maxAttempts} error=${error.message}`,
      );
    }
  }
}
