import { Injectable } from "@nestjs/common";
import { ACCESSORY_CONTENT_KEYWORDS } from "../constants/catchup.constants";
import { NormalizedRelease, RawExternalRelease } from "../types/catchup.types";

@Injectable()
export class ReleaseNormalizerService {
  normalize(raw: RawExternalRelease, fallbackReleaseAt: Date): NormalizedRelease | null {
    const externalId = this.toExternalId(raw.externalId);
    const title = raw.title?.trim();

    if (!externalId || !title) {
      return null;
    }

    const releaseAt = this.toDate(raw.releaseAt) ?? fallbackReleaseAt;

    return {
      source: raw.source,
      mediaType: raw.mediaType,
      eventType: raw.eventType,
      externalId,
      title,
      unitNumber: this.toPositiveInteger(raw.unitNumber),
      containerNumber: this.toPositiveInteger(raw.containerNumber),
      unitTitle: raw.unitTitle?.trim() || null,
      releaseAt,
      isAccessory: this.isAccessoryContent(raw),
      discriminator: raw.discriminator?.trim() || null,
      rawPayload: raw.payload ?? {},
    };
  }

  normalizeMany(items: RawExternalRelease[], fallbackReleaseAt: Date) {
    const normalized: NormalizedRelease[] = [];
    const discarded: RawExternalRelease[] = [];

    for (const item of items) {
      const result = this.normalize(item, fallbackReleaseAt);

      if (result) {
        normalized.push(result);
      } else {
        discarded.push(item);
      }
    }

    return { normalized, discarded };
  }

  isAccessoryContent(raw: Pick<RawExternalRelease, "kind" | "unitTitle">): boolean {
    const haystack = `${raw.kind ?? ""} ${raw.unitTitle ?? ""}`.toLowerCase();

    if (!haystack.trim()) {
      return false;
    }

    return ACCESSORY_CONTENT_KEYWORDS.some((keyword) => new RegExp(`\\b${keyword}\\b`).test(haystack));
  }

  private toExternalId(value: string | number | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const externalId = String(value).trim();

    return externalId.length > 0 ? externalId : null;
  }

  private toDate(value: Date | string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toPositiveInteger(value: number | null | undefined): number | null {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return null;
    }

    const integer = Math.trunc(value);

    return integer > 0 ? integer : null;
  }
}
