import { FeedEventType } from "@prisma/generated/enums";
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export interface FeedEventMetadata {
  readonly id: string;
  readonly [key: string]: any;
}

export class FeedEventDto {
  @IsEnum(FeedEventType)
  @IsNotEmpty()
  readonly type: FeedEventType;

  @IsNotEmpty()
  @IsUUID()
  readonly userId: string;
  
  @IsArray()
  @IsOptional()
  @IsUUID('7', { each: true })
  readonly entityIds?: string[] = [];
  
  @IsInt()
  @IsOptional()
  readonly count?: number = 1;

  @IsOptional()
  readonly metadata: FeedEventMetadata | FeedEventMetadata[];
}
