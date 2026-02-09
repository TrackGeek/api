import { IsEnum, IsNotEmpty } from "class-validator";
import { FeedEventType } from '../constants/feed-event-type';

export class FeedEventDto {
  @IsEnum(FeedEventType)
  @IsNotEmpty()
  readonly type: FeedEventType;
  
  @IsNotEmpty()
  readonly userId: string;
  
  @IsNotEmpty()
  readonly metadata: Record<string, any>;
}
