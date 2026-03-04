import { Injectable } from '@nestjs/common';
import { CreateOrUpdateAnimeEpisodeWatchDto } from './dtos/create-or-update-anime-episode-watch.dto';
import { DatabaseService } from '@/shared/infra/database/database.service';
import { GetAnimeEpisodeWatchDto } from './dtos/get-anime-episode-watch.dto';

@Injectable()
export class AnimeEpisodeWatchService {
  constructor(private readonly databaseService: DatabaseService) {}
  
  async createOrUpdateAnimeEpisodeWatch(createOrUpdateAnimeEpisodeWatchDto: CreateOrUpdateAnimeEpisodeWatchDto) {
    const { animeId, episode, status, userId } = createOrUpdateAnimeEpisodeWatchDto;
    
    await this.databaseService.animeEpisodeWatch.upsert({
      where: {
        userId_animeId_episode: {
          userId,
          animeId,
          episode,
        },
      },
      update: {
        status,
      },
      create: {
        animeId,
        episode,
        status,
        userId,
      },
    });
  }
  
  async getAnimeEpisodeWatch(getAnimeEpisodeWatchDto: GetAnimeEpisodeWatchDto) {
    const animeEpisodeWatch = await this.databaseService.animeEpisodeWatch.findMany({
      where: {
        userId: getAnimeEpisodeWatchDto.userId,
        animeId: getAnimeEpisodeWatchDto.animeId,
      },
    });
    
    return animeEpisodeWatch;
  }
}