import { Injectable } from "@nestjs/common";
import { ActivityType, ContentType } from "@prisma/generated/enums";
import { AnimeService } from "@/modules/anime/service/anime.service";
import { BookService } from "@/modules/book/service/book.service";
import { GameService } from "@/modules/game/service/game.service";
import { MangaService } from "@/modules/manga/service/manga.service";
import { MovieService } from "@/modules/movie/service/movie.service";
import { TVShowService } from "@/modules/tv-show/service/tv-show.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { ActivityService } from "../../activity/service/activity.service";
import { CreatePostDto } from "../dto/create-post.dto";
import { DeletePostDto } from "../dto/delete-post.dto";
import { UpdatePostDto } from "../dto/update-post.dto";

const POST_SELECT = {
  id: true,
  userId: true,
  content: true,
  isSpoiler: true,
  createdAt: true,
  updatedAt: true,
  anime: { select: { id: true, malId: true, title: true, imageUrl: true } },
  manga: { select: { id: true, anilistId: true, malId: true, title: true, imageUrl: true } },
  tvShow: { select: { id: true, tmdbId: true, name: true, posterUrl: true } },
  movie: { select: { id: true, tmdbId: true, title: true, posterUrl: true } },
  game: { select: { id: true, igdbId: true, name: true, coverUrl: true } },
  book: { select: { id: true, hardcoverId: true, title: true, imageUrl: true } },
};

type PostMedia = {
  animeId?: string;
  mangaId?: string;
  tvShowId?: string;
  movieId?: string;
  gameId?: string;
  bookId?: string;
};

@Injectable()
export class PostService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly activityService: ActivityService,
    private readonly animeService: AnimeService,
    private readonly mangaService: MangaService,
    private readonly tvShowService: TVShowService,
    private readonly movieService: MovieService,
    private readonly gameService: GameService,
    private readonly bookService: BookService,
  ) {}

  async createPost({ content, isSpoiler, mediaType, mediaExternalId, userId }: CreatePostDto) {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      throw new AppException(ERROR_CODES.UNPROCESSABLE_ENTITY);
    }

    const media = await this.resolveMedia(mediaType, mediaExternalId);

    const post = await this.databaseService.post.create({
      data: {
        userId,
        content: trimmedContent,
        isSpoiler: isSpoiler ?? false,
        ...media,
      },
      select: POST_SELECT,
    });

    await this.activityService.createActivity({
      type: ActivityType.PostCreated,
      userId,
      postId: post.id,
    });

    return post;
  }

  async updatePost({ postId, userId, content, isSpoiler }: UpdatePostDto) {
    const post = await this.databaseService.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true },
    });

    if (!post) {
      throw new AppException(ERROR_CODES.POST_NOT_FOUND);
    }

    if (post.userId !== userId) {
      throw new AppException(ERROR_CODES.UNAUTHORIZED);
    }

    const trimmedContent = content?.trim();

    if (content !== undefined && !trimmedContent) {
      throw new AppException(ERROR_CODES.UNPROCESSABLE_ENTITY);
    }

    return this.databaseService.post.update({
      where: { id: post.id },
      data: {
        ...(trimmedContent && { content: trimmedContent }),
        ...(isSpoiler !== undefined && { isSpoiler }),
      },
      select: POST_SELECT,
    });
  }

  async deletePost({ postId, userId }: DeletePostDto) {
    const post = await this.databaseService.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true },
    });

    if (!post) {
      throw new AppException(ERROR_CODES.POST_NOT_FOUND);
    }

    if (post.userId !== userId) {
      throw new AppException(ERROR_CODES.UNAUTHORIZED);
    }

    await this.databaseService.post.delete({ where: { id: post.id } });
  }

  async getPostById(postId: string) {
    const post = await this.databaseService.post.findUnique({
      where: { id: postId },
      select: POST_SELECT,
    });

    if (!post) {
      throw new AppException(ERROR_CODES.POST_NOT_FOUND);
    }

    return post;
  }

  private async resolveMedia(mediaType?: ContentType, mediaExternalId?: number): Promise<PostMedia> {
    if (!mediaType || !mediaExternalId) return {};

    switch (mediaType) {
      case ContentType.Anime: {
        const anime = await this.animeService.getAnimeByMalId(mediaExternalId);

        return { animeId: anime.id };
      }
      case ContentType.Manga: {
        const manga = await this.mangaService.getMangaByAnilistId(mediaExternalId);

        return { mangaId: manga.id };
      }
      case ContentType.TVShow: {
        const tvShow = await this.tvShowService.getTVShowByTmdbId(mediaExternalId);

        return { tvShowId: tvShow.id };
      }
      case ContentType.Movie: {
        const movie = await this.movieService.getMovieByTmdbId(mediaExternalId);

        return { movieId: movie.id };
      }
      case ContentType.Game: {
        const game = await this.gameService.getGameByIgdbId(mediaExternalId);

        return { gameId: game.id };
      }
      case ContentType.Book: {
        const book = await this.bookService.getBookByHardcoverId(mediaExternalId);

        return { bookId: book.id };
      }
      default:
        return {};
    }
  }
}
