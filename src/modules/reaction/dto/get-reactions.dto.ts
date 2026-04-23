import { ApiProperty } from "@nestjs/swagger";
import { ReactionType } from "@prisma/generated/enums";
import { IsEnum, IsOptional } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";
import { ReactionRequiredForType } from "./create-reaction.dto";

export class GetReactionsDto extends OffsetPaginationParamsDto {
  @IsEnum(ReactionType)
  @ApiProperty({ enum: ReactionType })
  readonly type: ReactionType;

  @IsOptional()
  @ReactionRequiredForType(ReactionType.Comment)
  @ApiProperty({
    type: "string",
    format: "uuid",
    required: false,
    description: "Required when type is Comment",
  })
  readonly commentId?: string;

  @IsOptional()
  @ReactionRequiredForType(ReactionType.FeedEvent)
  @ApiProperty({
    type: "string",
    format: "uuid",
    required: false,
    description: "Required when type is FeedEvent",
  })
  readonly feedEventId?: string;
}
