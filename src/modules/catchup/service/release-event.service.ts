import { Injectable } from "@nestjs/common";
import { ReleaseEventModel } from "@prisma/generated/models";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { CATCHUP_MEDIA_CONFIG } from "../constants/media-config";
import { InternalTitleMatch, NormalizedRelease } from "../types/catchup.types";

export interface FindOrCreateReleaseEventParams {
  readonly release: NormalizedRelease;
  readonly match: InternalTitleMatch;
  readonly runId?: string | null;
}

export interface FindOrCreateReleaseEventResult {
  readonly event: ReleaseEventModel;
  readonly created: boolean;
}

export function buildIdempotencyKey(release: NormalizedRelease, titleId: string): string {
  return [
    release.mediaType,
    titleId,
    release.eventType,
    release.containerNumber ?? "-",
    release.unitNumber ?? "-",
    release.discriminator ?? "-",
  ].join(":");
}

@Injectable()
export class ReleaseEventService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findOrCreate({
    release,
    match,
    runId = null,
  }: FindOrCreateReleaseEventParams): Promise<FindOrCreateReleaseEventResult> {
    const config = CATCHUP_MEDIA_CONFIG[release.mediaType];
    const idempotencyKey = buildIdempotencyKey(release, match.titleId);

    const existing = await this.databaseService.releaseEvent.findUnique({ where: { idempotencyKey } });

    if (existing) {
      const event = await this.databaseService.releaseEvent.update({
        where: { idempotencyKey },
        data: {
          title: release.title,
          unitTitle: release.unitTitle,
          releaseAt: release.releaseAt,
          isAccessory: release.isAccessory,
          rawPayload: release.rawPayload as any,
        },
      });

      return { event, created: false };
    }

    try {
      const event = await this.databaseService.releaseEvent.create({
        data: {
          type: release.eventType,
          mediaType: release.mediaType,
          source: release.source,
          externalId: release.externalId,
          idempotencyKey,
          title: release.title,
          unitNumber: release.unitNumber,
          containerNumber: release.containerNumber,
          unitTitle: release.unitTitle,
          isAccessory: release.isAccessory,
          releaseAt: release.releaseAt,
          rawPayload: release.rawPayload as any,
          runId,
          [config.eventForeignKey]: match.titleId,
        },
      });

      return { event, created: true };
    } catch (error: any) {
      if (error?.code !== "P2002") {
        throw error;
      }

      const event = await this.databaseService.releaseEvent.findUniqueOrThrow({ where: { idempotencyKey } });

      return { event, created: false };
    }
  }
}
