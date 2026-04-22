import { ApiProperty } from "@nestjs/swagger";
import { ReactionType } from "@prisma/generated/enums";
import {
  IsEnum,
  IsOptional,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";
import { IsEmoji } from "@/shared/validators/is-emoji.validator";

export function ReactionRequiredForType(reactionType: ReactionType, options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "reactionRequiredForType",
      target: object.constructor,
      propertyName,
      constraints: [reactionType],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const dto = args.object as CreateReactionDto;
          if (dto.type === reactionType) {
            return value !== undefined && value !== null && value !== "";
          }
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const [type] = args.constraints as [ReactionType];
          return `${args.property} is required when type is ${type}`;
        },
      },
    });
  };
}

export class CreateReactionDto {
  @IsEnum(ReactionType)
  @ApiProperty({ enum: ReactionType })
  readonly type: ReactionType;

  @ApiProperty({ type: "string" })
  readonly userId: string;

  @IsEmoji()
  @ApiProperty({ type: "string" })
  readonly emoji: string;

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
