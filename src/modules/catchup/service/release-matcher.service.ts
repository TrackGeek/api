import { Injectable } from "@nestjs/common";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { MIN_FUZZY_MATCH_TITLE_LENGTH } from "../constants/catchup.constants";
import { CATCHUP_MEDIA_CONFIG } from "../constants/media-config";
import { InternalTitleMatch, NormalizedRelease } from "../types/catchup.types";

export type MatchOutcome =
  | { readonly status: "matched"; readonly match: InternalTitleMatch }
  | { readonly status: "unmatched" }
  | { readonly status: "ambiguous"; readonly candidates: number };

export function normalizeTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

@Injectable()
export class ReleaseMatcherService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findInternalTitle(release: NormalizedRelease): Promise<MatchOutcome> {
    const config = CATCHUP_MEDIA_CONFIG[release.mediaType];
    const model = this.databaseService[config.model] as any;

    const externalId = Number(release.externalId);

    if (Number.isFinite(externalId)) {
      const byExternalId = await model.findUnique({
        where: { [config.externalIdField]: externalId },
        select: { id: true, [config.titleField]: true },
      });

      if (byExternalId) {
        return {
          status: "matched",
          match: {
            titleId: byExternalId.id,
            mediaType: release.mediaType,
            title: byExternalId[config.titleField] ?? release.title,
            confidence: "external-id",
          },
        };
      }
    }

    const normalizedTitle = normalizeTitle(release.title);

    if (normalizedTitle.length < MIN_FUZZY_MATCH_TITLE_LENGTH) {
      return { status: "unmatched" };
    }

    const candidates = await model.findMany({
      where: { [config.titleField]: { equals: release.title, mode: "insensitive" } },
      select: { id: true, [config.titleField]: true },
      take: 5,
    });

    const exact = candidates.filter(
      (candidate: Record<string, string | null>) =>
        normalizeTitle(candidate[config.titleField] ?? "") === normalizedTitle,
    );

    if (exact.length === 0) {
      return { status: "unmatched" };
    }

    if (exact.length > 1) {
      return { status: "ambiguous", candidates: exact.length };
    }

    return {
      status: "matched",
      match: {
        titleId: exact[0].id,
        mediaType: release.mediaType,
        title: exact[0][config.titleField] ?? release.title,
        confidence: "normalized-title",
      },
    };
  }
}
