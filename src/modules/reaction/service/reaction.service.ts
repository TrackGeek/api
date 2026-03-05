import { Injectable } from "@nestjs/common";
import { ReactionFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { CreateReactionDto } from "../dto/create-reaction.dto";
import { DeleteReactionDto } from "../dto/delete-reaction.dto";
import { GetReactionsDto } from "../dto/get-reactions.dto";

@Injectable()
export class ReactionService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createReaction(createReactionDto: CreateReactionDto) {
    const { emoji, userId, item, type } = createReactionDto;

    const entityId = { ...item } as Record<string, any>;

    await this.databaseService.reaction.create({
      data: {
        type,
        emoji,
        userId,
        ...entityId,
      },
    });
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
    const pagination = await this.databaseService.cursorPagination<ReactionFindManyArgs>({
      model: "reaction",
      where: {
        type: getReactionsDto.type,
        ...getReactionsDto.item,
      },
      cursor: getReactionsDto.cursor,
      itemsPerPage: getReactionsDto.itemsPerPage,
      include: {
        comment: true,
        feedEvent: true,
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
