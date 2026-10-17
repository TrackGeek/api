import { Injectable } from "@nestjs/common";
import { OAuthAccessException } from "@/modules/oauth/exceptions/oauth-access.exception";
import type { OAuthPrincipal } from "@/modules/oauth/types/oauth-principal";
import { INTEGRATION_TOOLS, type IntegrationOperation } from "../constants/integration-tools";
import { IntegrationRateLimitService } from "./integration-rate-limit.service";
import { TrackingCatalogService } from "./tracking-catalog.service";
import { TrackingLibraryService } from "./tracking-library.service";
import { TrackingProgressService } from "./tracking-progress.service";

@Injectable()
export class IntegrationOperationsService {
  constructor(
    private readonly catalog: TrackingCatalogService,
    private readonly library: TrackingLibraryService,
    private readonly progress: TrackingProgressService,
    private readonly rateLimit: IntegrationRateLimitService,
  ) {}

  async execute(name: IntegrationOperation, input: unknown, principal: OAuthPrincipal | null, address: string) {
    const { scope } = INTEGRATION_TOOLS[name];
    if (scope && !principal) throw new OAuthAccessException("invalid_token", [scope]);
    if (scope && !principal?.scopes.includes(scope)) throw new OAuthAccessException("insufficient_scope", [scope]);
    await this.rateLimit.consume(principal, scope === "progress:write", address);

    switch (name) {
      case "search_media":
        return this.catalog.search(input);
      case "get_media_details":
        return this.catalog.details(input);
      case "get_episodes":
        return this.catalog.episodes(input);
      case "get_my_profile":
        return this.library.profile(principal!.userId);
      case "get_my_library":
        return this.library.library(principal!.userId, input);
      case "get_my_progress":
        return this.library.progress(principal!.userId, input);
      case "get_my_catchup":
        return this.library.releases(principal!.userId, input);
      case "set_media_status":
        return this.progress.setStatus(principal!.userId, input);
      case "set_book_progress":
        return this.progress.setBook(principal!.userId, input);
      case "set_manga_progress":
        return this.progress.setManga(principal!.userId, input);
      case "set_game_progress":
        return this.progress.setGame(principal!.userId, input);
      case "set_episode_status":
        return this.progress.setEpisode(principal!.userId, input);
    }
  }
}
