import { Injectable } from "@nestjs/common";
import { ReleaseEventFindManyArgs } from "@prisma/generated/models";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { addDays } from "@/shared/utils/date";
import { DEFAULT_FEED_WINDOW_DAYS, RELEASE_EVENT_MEDIA_INCLUDE } from "../constants/catchup.constants";
import { GetCatchupFeedByUserDto } from "../dto/get-catchup-feed.dto";

@Injectable()
export class CatchupFeedService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getFeed({ userId, days, page, itemsPerPage, mediaType }: GetCatchupFeedByUserDto) {
    const since = addDays(new Date(), -(days ?? DEFAULT_FEED_WINDOW_DAYS));

    return this.databaseService.offsetPagination<ReleaseEventFindManyArgs>({
      model: "releaseEvent",
      where: {
        releaseAt: { gte: since },
        ...(mediaType && { mediaType }),
        OR: [
          { anime: { animeProgresses: { some: { userId } } } },
          { manga: { mangaProgresses: { some: { userId } } } },
          { tvShow: { tvshowProgresses: { some: { userId } } } },
          { game: { gameProgresses: { some: { userId } } } },
          { game: { favorites: { some: { userId } } } },
        ],
      },
      page,
      itemsPerPage,
      orderBy: [{ releaseAt: "desc" }, { createdAt: "desc" }],
      include: RELEASE_EVENT_MEDIA_INCLUDE,
    });
  }
}
