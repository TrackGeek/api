import { ApiProperty } from "@nestjs/swagger";
import { MessageType } from "@prisma/generated/enums";
import { IsEnum, IsNotEmpty, IsString, MaxLength, registerDecorator, type ValidationArguments } from "class-validator";
import { CHAT_STICKER_IDS, MAX_MESSAGE_LENGTH } from "../chat.constants";

function IsValidMessageContent() {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "isValidMessageContent",
      target: object.constructor,
      propertyName,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const { type } = args.object as { type?: MessageType };

          if (type !== MessageType.Sticker) return true;

          return typeof value === "string" && (CHAT_STICKER_IDS as readonly string[]).includes(value);
        },
        defaultMessage: () => `content must be one of: ${CHAT_STICKER_IDS.join(", ")} when type is Sticker`,
      },
    });
  };
}

export class SendMessageDto {
  @IsEnum(MessageType)
  @ApiProperty({ enum: MessageType })
  readonly type: MessageType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_MESSAGE_LENGTH)
  @IsValidMessageContent()
  @ApiProperty({ maxLength: MAX_MESSAGE_LENGTH, description: `For Sticker, one of: ${CHAT_STICKER_IDS.join(", ")}` })
  readonly content: string;
}
