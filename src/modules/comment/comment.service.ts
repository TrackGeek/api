import { Injectable } from "@nestjs/common";
import { FeedEventType } from "@prisma/generated/enums";
import {
  AnimeCommentFindManyArgs,
  BookCommentFindManyArgs,
  GameCommentFindManyArgs,
  MangaCommentFindManyArgs,
  MovieCommentFindManyArgs,
  ProfileCommentFindManyArgs,
  TvShowCommentFindManyArgs,
} from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { AddCommentToAnimeDto } from "./dtos/add-comment-to-anime.dto";
import { AddCommentToBookDto } from "./dtos/add-comment-to-book.dto";
import { AddCommentToGameDto } from "./dtos/add-comment-to-game.dto";
import { AddCommentToMangaDto } from "./dtos/add-comment-to-manga.dto";
import { AddCommentToMovieDto } from "./dtos/add-comment-to-movie.dto";
import { AddCommentToProfileDto } from "./dtos/add-comment-to-profile.dto";
import { AddCommentToTVShowDto } from "./dtos/add-comment-to-tv-show.dto";
import { CreateCommentDto } from "./dtos/create-comment.dto";

@Injectable()
export class CommentService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
  ) {}

  async createComment(createCommentDto: CreateCommentDto) {
    const userAlreadyExists = await this.databaseService.user.findUnique({
      where: { id: createCommentDto.userId },
    });

    if (!userAlreadyExists) {
      throw new AppException(ERROR_CODES.USER_NOT_FOUND);
    }

    return this.databaseService.comment.create({
      data: {
        content: createCommentDto.content,
        userId: createCommentDto.userId,
      },
    });
  }

  async addCommentToProfile(addCommentToProfileDto: AddCommentToProfileDto) {
    const profileAlreadyExists = await this.databaseService.profile.findUnique({
      where: { id: addCommentToProfileDto.profileId },
    });

    if (!profileAlreadyExists) {
      throw new AppException(ERROR_CODES.PROFILE_NOT_FOUND);
    }

    const comment = await this.createComment({
      content: addCommentToProfileDto.content,
      userId: addCommentToProfileDto.userId,
    });

    const profileComment = await this.databaseService.profileComment.create({
      data: {
        profileId: addCommentToProfileDto.profileId,
        commentId: comment.id,
      },
      include: {
        comment: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        profile: {
          include: {
            user: true,
          },
        },
      },
    });

    await this.queueService.toFeedEventQueue({
      type: FeedEventType.NewComment,
      userId: addCommentToProfileDto.userId,
      metadata: {
        comment: {
          id: comment.id,
          content: comment.content,
          user: {
            id: profileComment.comment.user.id,
            name: profileComment.comment.user.name,
            username: profileComment.comment.user.username,
            profile: {
              id: profileComment.comment.user.profile?.id,
              avatarUrl: profileComment.comment.user.profile?.avatarUrl,
            },
          },
          createdAt: comment.createdAt,
        },
        user: {
          id: profileComment.profile.user.id,
          name: profileComment.profile.user.name,
          username: profileComment.profile.user.username,
          profile: {
            id: profileComment.profile.id,
            avatarUrl: profileComment.profile.avatarUrl,
          },
        },
      },
    });
  }

  async addCommentToGame(addCommentToGameDto: AddCommentToGameDto) {
    const gameAlreadyExists = await this.databaseService.game.findUnique({
      where: { id: addCommentToGameDto.gameId },
    });

    if (!gameAlreadyExists) {
      throw new AppException(ERROR_CODES.GAME_NOT_FOUND);
    }

    const comment = await this.createComment({
      content: addCommentToGameDto.content,
      userId: addCommentToGameDto.userId,
    });

    const gameComment = await this.databaseService.gameComment.create({
      data: {
        gameId: addCommentToGameDto.gameId,
        commentId: comment.id,
      },
      include: {
        comment: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        game: true,
      },
    });

    await this.queueService.toFeedEventQueue({
      type: FeedEventType.NewComment,
      userId: addCommentToGameDto.userId,
      metadata: {
        comment: {
          id: comment.id,
          content: comment.content,
          user: {
            id: gameComment.comment.user.id,
            name: gameComment.comment.user.name,
            username: gameComment.comment.user.username,
            profile: {
              id: gameComment.comment.user.profile?.id,
              avatarUrl: gameComment.comment.user.profile?.avatarUrl,
            },
          },
          createdAt: comment.createdAt,
        },
        game: {
          igdbId: gameComment.game.igdbId,
          name: gameComment.game.name,
          coverUrl: gameComment.game.coverUrl,
        },
      },
    });
  }

  async addCommentToBook(addCommentToBookDto: AddCommentToBookDto) {
    const bookAlreadyExists = await this.databaseService.book.findUnique({
      where: { id: addCommentToBookDto.bookId },
    });

    if (!bookAlreadyExists) {
      throw new AppException(ERROR_CODES.BOOK_NOT_FOUND);
    }

    const comment = await this.createComment({
      content: addCommentToBookDto.content,
      userId: addCommentToBookDto.userId,
    });

    const bookComment = await this.databaseService.bookComment.create({
      data: {
        bookId: addCommentToBookDto.bookId,
        commentId: comment.id,
      },
      include: {
        comment: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        book: true,
      },
    });

    await this.queueService.toFeedEventQueue({
      type: FeedEventType.NewComment,
      userId: addCommentToBookDto.userId,
      metadata: {
        comment: {
          id: comment.id,
          content: comment.content,
          user: {
            id: bookComment.comment.user.id,
            name: bookComment.comment.user.name,
            username: bookComment.comment.user.username,
            profile: {
              id: bookComment.comment.user.profile?.id,
              avatarUrl: bookComment.comment.user.profile?.avatarUrl,
            },
          },
          createdAt: comment.createdAt,
        },
        book: {
          hardcoverId: bookComment.book.hardcoverId,
          title: bookComment.book.title,
        },
      },
    });
  }

  async addCommentToAnime(addCommentToAnimeDto: AddCommentToAnimeDto) {
    const animeAlreadyExists = await this.databaseService.anime.findUnique({
      where: { id: addCommentToAnimeDto.animeId },
    });

    if (!animeAlreadyExists) {
      throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
    }

    const comment = await this.createComment({
      content: addCommentToAnimeDto.content,
      userId: addCommentToAnimeDto.userId,
    });

    const animeComment = await this.databaseService.animeComment.create({
      data: {
        animeId: addCommentToAnimeDto.animeId,
        commentId: comment.id,
      },
      include: {
        comment: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        anime: true,
      },
    });

    await this.queueService.toFeedEventQueue({
      type: FeedEventType.NewComment,
      userId: addCommentToAnimeDto.userId,
      metadata: {
        comment: {
          id: comment.id,
          content: comment.content,
          user: {
            id: animeComment.comment.user.id,
            name: animeComment.comment.user.name,
            username: animeComment.comment.user.username,
            profile: {
              id: animeComment.comment.user.profile?.id,
              avatarUrl: animeComment.comment.user.profile?.avatarUrl,
            },
          },
          createdAt: comment.createdAt,
        },
        anime: {
          malId: animeComment.anime.malId,
        },
      },
    });
  }

  async addCommentToManga(addCommentToMangaDto: AddCommentToMangaDto) {
    const mangaAlreadyExists = await this.databaseService.manga.findUnique({
      where: { id: addCommentToMangaDto.mangaId },
    });

    if (!mangaAlreadyExists) {
      throw new AppException(ERROR_CODES.MANGA_NOT_FOUND);
    }

    const comment = await this.createComment({
      content: addCommentToMangaDto.content,
      userId: addCommentToMangaDto.userId,
    });

    const mangaComment = await this.databaseService.mangaComment.create({
      data: {
        mangaId: addCommentToMangaDto.mangaId,
        commentId: comment.id,
      },
      include: {
        comment: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        manga: true,
      },
    });

    await this.queueService.toFeedEventQueue({
      type: FeedEventType.NewComment,
      userId: addCommentToMangaDto.userId,
      metadata: {
        comment: {
          id: comment.id,
          content: comment.content,
          user: {
            id: mangaComment.comment.user.id,
            name: mangaComment.comment.user.name,
            username: mangaComment.comment.user.username,
            profile: {
              id: mangaComment.comment.user.profile?.id,
              avatarUrl: mangaComment.comment.user.profile?.avatarUrl,
            },
          },
          createdAt: comment.createdAt,
        },
        manga: {
          malId: mangaComment.manga.malId,
        },
      },
    });
  }

  async addCommentToMovie(addCommentToMovieDto: AddCommentToMovieDto) {
    const movieAlreadyExists = await this.databaseService.movie.findUnique({
      where: { id: addCommentToMovieDto.movieId },
    });

    if (!movieAlreadyExists) {
      throw new AppException(ERROR_CODES.MOVIE_NOT_FOUND);
    }

    const comment = await this.createComment({
      content: addCommentToMovieDto.content,
      userId: addCommentToMovieDto.userId,
    });

    const movieComment = await this.databaseService.movieComment.create({
      data: {
        movieId: addCommentToMovieDto.movieId,
        commentId: comment.id,
      },
      include: {
        comment: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        movie: true,
      },
    });

    await this.queueService.toFeedEventQueue({
      type: FeedEventType.NewComment,
      userId: addCommentToMovieDto.userId,
      metadata: {
        comment: {
          id: comment.id,
          content: comment.content,
          user: {
            id: movieComment.comment.user.id,
            name: movieComment.comment.user.name,
            username: movieComment.comment.user.username,
            profile: {
              id: movieComment.comment.user.profile?.id,
              avatarUrl: movieComment.comment.user.profile?.avatarUrl,
            },
          },
          createdAt: comment.createdAt,
        },
        movie: {
          tmdbId: movieComment.movie.tmdbId,
        },
      },
    });
  }

  async addCommentToTVShow(addCommentToTVShowDto: AddCommentToTVShowDto) {
    const tvShowAlreadyExists = await this.databaseService.tvShow.findUnique({
      where: { id: addCommentToTVShowDto.tvShowId },
    });

    if (!tvShowAlreadyExists) {
      throw new AppException(ERROR_CODES.TVSHOW_NOT_FOUND);
    }

    const comment = await this.createComment({
      content: addCommentToTVShowDto.content,
      userId: addCommentToTVShowDto.userId,
    });

    const tvShowComment = await this.databaseService.tvShowComment.create({
      data: {
        tvShowId: addCommentToTVShowDto.tvShowId,
        commentId: comment.id,
      },
      include: {
        comment: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        tvShow: true,
      },
    });

    await this.queueService.toFeedEventQueue({
      type: FeedEventType.NewComment,
      userId: addCommentToTVShowDto.userId,
      metadata: {
        comment: {
          id: comment.id,
          content: comment.content,
          user: {
            id: tvShowComment.comment.user.id,
            name: tvShowComment.comment.user.name,
            username: tvShowComment.comment.user.username,
            profile: {
              id: tvShowComment.comment.user.profile?.id,
              avatarUrl: tvShowComment.comment.user.profile?.avatarUrl,
            },
          },
          createdAt: comment.createdAt,
        },
        tvShow: {
          tmdbId: tvShowComment.tvShow.tmdbId,
        },
      },
    });
  }

  async deleteComment(commentId: string) {
    const commentAlreadyExists = await this.databaseService.comment.findUnique({
      where: { id: commentId },
    });

    if (!commentAlreadyExists) {
      throw new AppException(ERROR_CODES.COMMENT_NOT_FOUND);
    }

    await this.databaseService.comment.delete({
      where: { id: commentId },
    });
  }

  async getCommentsByProfileId(profileId: string) {
    const profileAlreadyExists = await this.databaseService.profile.findUnique({
      where: { id: profileId },
    });

    if (!profileAlreadyExists) {
      throw new AppException(ERROR_CODES.PROFILE_NOT_FOUND);
    }

    const pagination = await this.databaseService.cursorPagination<ProfileCommentFindManyArgs>({
      model: "profileComment",
      where: { profileId },
      include: {
        comment: {
          omit: {
            userId: true,
          },
          include: {
            _count: {
              select: {
                commentsReactions: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                profile: {
                  select: {
                    avatarUrl: true,
                  },
                },
              },
            },
            commentsReactions: {
              take: 3,
              orderBy: { reaction: { createdAt: "desc" } },
              select: {
                reaction: {
                  select: {
                    id: true,
                    emoji: true,
                    createdAt: true,
                    user: {
                      select: {
                        username: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      ...pagination,
      items: pagination.items.map(({ comment }) => comment),
    };
  }

  async getCommentsByGameId(gameId: string) {
    const gameAlreadyExists = await this.databaseService.game.findUnique({
      where: { id: gameId },
    });

    if (!gameAlreadyExists) {
      throw new AppException(ERROR_CODES.GAME_NOT_FOUND);
    }

    const pagination = await this.databaseService.cursorPagination<GameCommentFindManyArgs>({
      model: "gameComment",
      where: { gameId },
      include: {
        comment: {
          omit: {
            userId: true,
          },
          include: {
            _count: {
              select: {
                commentsReactions: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                profile: {
                  select: {
                    avatarUrl: true,
                  },
                },
              },
            },
            commentsReactions: {
              take: 3,
              orderBy: { reaction: { createdAt: "desc" } },
              select: {
                reaction: {
                  select: {
                    id: true,
                    emoji: true,
                    createdAt: true,
                    user: {
                      select: {
                        username: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      ...pagination,
      items: pagination.items.map(({ comment }) => comment),
    };
  }

  async getCommentsByBookId(bookId: string) {
    const bookAlreadyExists = await this.databaseService.book.findUnique({
      where: { id: bookId },
    });

    if (!bookAlreadyExists) {
      throw new AppException(ERROR_CODES.BOOK_NOT_FOUND);
    }

    const pagination = await this.databaseService.cursorPagination<BookCommentFindManyArgs>({
      model: "bookComment",
      where: { bookId },
      include: {
        comment: {
          omit: {
            userId: true,
          },
          include: {
            _count: {
              select: {
                commentsReactions: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                profile: {
                  select: {
                    avatarUrl: true,
                  },
                },
              },
            },
            commentsReactions: {
              take: 3,
              orderBy: { reaction: { createdAt: "desc" } },
              select: {
                reaction: {
                  select: {
                    id: true,
                    emoji: true,
                    createdAt: true,
                    user: {
                      select: {
                        username: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      ...pagination,
      items: pagination.items.map(({ comment }) => comment),
    };
  }

  async getCommentsByAnimeId(animeId: string) {
    const animeAlreadyExists = await this.databaseService.anime.findUnique({
      where: { id: animeId },
    });

    if (!animeAlreadyExists) {
      throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
    }

    const pagination = await this.databaseService.cursorPagination<AnimeCommentFindManyArgs>({
      model: "animeComment",
      where: { animeId },
      include: {
        comment: {
          omit: {
            userId: true,
          },
          include: {
            _count: {
              select: {
                commentsReactions: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                profile: {
                  select: {
                    avatarUrl: true,
                  },
                },
              },
            },
            commentsReactions: {
              take: 3,
              orderBy: { reaction: { createdAt: "desc" } },
              select: {
                reaction: {
                  select: {
                    id: true,
                    emoji: true,
                    createdAt: true,
                    user: {
                      select: {
                        username: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      ...pagination,
      items: pagination.items.map(({ comment }) => comment),
    };
  }

  async getCommentsByMangaId(mangaId: string) {
    const mangaAlreadyExists = await this.databaseService.manga.findUnique({
      where: { id: mangaId },
    });

    if (!mangaAlreadyExists) {
      throw new AppException(ERROR_CODES.MANGA_NOT_FOUND);
    }

    const pagination = await this.databaseService.cursorPagination<MangaCommentFindManyArgs>({
      model: "mangaComment",
      where: { mangaId },
      include: {
        comment: {
          omit: {
            userId: true,
          },
          include: {
            _count: {
              select: {
                commentsReactions: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                profile: {
                  select: {
                    avatarUrl: true,
                  },
                },
              },
            },
            commentsReactions: {
              take: 3,
              orderBy: { reaction: { createdAt: "desc" } },
              select: {
                reaction: {
                  select: {
                    id: true,
                    emoji: true,
                    createdAt: true,
                    user: {
                      select: {
                        username: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      ...pagination,
      items: pagination.items.map(({ comment }) => comment),
    };
  }

  async getCommentsByMovieId(movieId: string) {
    const movieAlreadyExists = await this.databaseService.movie.findUnique({
      where: { id: movieId },
    });

    if (!movieAlreadyExists) {
      throw new AppException(ERROR_CODES.MOVIE_NOT_FOUND);
    }

    const pagination = await this.databaseService.cursorPagination<MovieCommentFindManyArgs>({
      model: "movieComment",
      where: { movieId },
      include: {
        comment: {
          omit: {
            userId: true,
          },
          include: {
            _count: {
              select: {
                commentsReactions: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                profile: {
                  select: {
                    avatarUrl: true,
                  },
                },
              },
            },
            commentsReactions: {
              take: 3,
              orderBy: { reaction: { createdAt: "desc" } },
              select: {
                reaction: {
                  select: {
                    id: true,
                    emoji: true,
                    createdAt: true,
                    user: {
                      select: {
                        username: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      ...pagination,
      items: pagination.items.map(({ comment }) => comment),
    };
  }

  async getCommentsByTVShowId(tvShowId: string) {
    const tvShowAlreadyExists = await this.databaseService.tvShow.findUnique({
      where: { id: tvShowId },
    });

    if (!tvShowAlreadyExists) {
      throw new AppException(ERROR_CODES.TVSHOW_NOT_FOUND);
    }

    const pagination = await this.databaseService.cursorPagination<TvShowCommentFindManyArgs>({
      model: "tvShowComment",
      where: { tvShowId },
      include: {
        comment: {
          omit: {
            userId: true,
          },
          include: {
            _count: {
              select: {
                commentsReactions: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                profile: {
                  select: {
                    avatarUrl: true,
                  },
                },
              },
            },
            commentsReactions: {
              take: 3,
              orderBy: { reaction: { createdAt: "desc" } },
              select: {
                reaction: {
                  select: {
                    id: true,
                    emoji: true,
                    createdAt: true,
                    user: {
                      select: {
                        username: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      ...pagination,
      items: pagination.items.map(({ comment }) => comment),
    };
  }
}
