import { Injectable } from "@nestjs/common";
import { CommentFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { CreateCommentDto } from "../dto/create-comment.dto";
import { DeleteCommentDto } from "../dto/delete-comment.dto";
import { GetCommentsDto } from "../dto/get-comments.dto";

@Injectable()
export class CommentService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createComment(createCommentDto: CreateCommentDto) {
    const { type, content, userId, item } = createCommentDto;

    const entityId = { ...item } as Record<string, any>;

    await this.databaseService.comment.create({
      data: {
        type,
        content,
        userId,
        ...entityId,
      },
    });
  }

  async deleteComment(deleteCommentDto: DeleteCommentDto) {
    const comment = await this.databaseService.comment.findUnique({
      where: { id: deleteCommentDto.commentId },
    });

    if (!comment || comment.userId !== deleteCommentDto.userId) {
      throw new AppException(ERROR_CODES.COMMENT_NOT_FOUND);
    }

    await this.databaseService.comment.delete({
      where: { id: comment.id },
    });
  }

  async getComments(getCommentsDto: GetCommentsDto) {
    const pagination = await this.databaseService.offsetPagination<CommentFindManyArgs>({
      model: "comment",
      where: {
        type: getCommentsDto.type,
        ...getCommentsDto.item,
      },
      page: getCommentsDto.page,
      itemsPerPage: getCommentsDto.itemsPerPage,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            profile: {
              select: {
                id: true,
                avatarUrl: true,
              },
            },
          },
        },
        anime: {
          select: {
            id: true,
            malId: true,
            title: true,
            imageUrl: true,
          },
        },
        manga: {
          select: {
            id: true,
            malId: true,
            title: true,
            imageUrl: true,
          },
        },
        tvShow: {
          select: {
            id: true,
            tmdbId: true,
            name: true,
            posterUrl: true,
          },
        },
        movie: {
          select: {
            id: true,
            tmdbId: true,
            title: true,
            posterUrl: true,
          },
        },
        game: {
          select: {
            id: true,
            igdbId: true,
            name: true,
            coverUrl: true,
          },
        },
        book: {
          select: {
            id: true,
            hardcoverId: true,
            title: true,
            imageUrl: true,
          },
        },
        reactions: {
          take: 3,
          orderBy: { createdAt: "desc" },
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
    });

    return pagination;
  }
}
