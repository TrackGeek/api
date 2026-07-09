import { Injectable } from "@nestjs/common";
import { ReactionFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { CreateReactionDto } from "../dto/create-reaction.dto";
import { DeleteReactionDto } from "../dto/delete-reaction.dto";
import { GetReactionsDto } from "../dto/get-reactions.dto";

@Injectable()
export class ReactionService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
  ) {}

  async createReaction(createReactionDto: CreateReactionDto) {
    const { emoji, userId, type, ...entityIds } = createReactionDto;

    const reaction = await this.databaseService.reaction.create({
      data: {
        type,
        emoji,
        userId,
        ...entityIds,
      },
    });

    await this.queueService.toReactionNotificationJob({ reactionId: reaction.id });
  }

  async deleteReaction(deleteReactionDto: DeleteReactionDto) {
    const reaction = await this.databaseService.reaction.findUnique({
      where: { id: deleteReactionDto.reactionId },
    });

    if (!reaction || reaction.userId !== deleteReactionDto.userId) {
      throw new AppException(ERROR_CODES.REACTION_NOT_FOUND);
    }

    await this.databaseService.reaction.delete({
      where: { id: reaction.id },
    });
  }

  async getReactions(getReactionsDto: GetReactionsDto) {
    const pagination = await this.databaseService.offsetPagination<ReactionFindManyArgs>({
      model: "reaction",
      where: {
        type: getReactionsDto.type,
        commentId: getReactionsDto.commentId,
        activityId: getReactionsDto.activityId,
        gameReviewId: getReactionsDto.gameReviewId,
        animeReviewId: getReactionsDto.animeReviewId,
        mangaReviewId: getReactionsDto.mangaReviewId,
        tvShowReviewId: getReactionsDto.tvShowReviewId,
        movieReviewId: getReactionsDto.movieReviewId,
        bookReviewId: getReactionsDto.bookReviewId,
      },
      page: getReactionsDto.page,
      itemsPerPage: getReactionsDto.itemsPerPage,
      include: {
        comment: true,
        activity: true,
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
      },
    });

    return pagination;
  }
}
