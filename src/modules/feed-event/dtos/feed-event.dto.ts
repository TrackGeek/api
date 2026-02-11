import { FeedEventType } from '@prisma/generated/enums';
import { IsEnum, IsNotEmpty } from "class-validator";

export class FeedEventDto {
  @IsEnum(FeedEventType)
  @IsNotEmpty()
  readonly type: FeedEventType;
  
  @IsNotEmpty()
  readonly userId: string;
  
  @IsNotEmpty()
  readonly metadata: Record<string, any>;
}
