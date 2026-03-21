import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FeedEventType } from "@prisma/generated/enums";
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export interface FeedEventMetadata {
  readonly id: string;
  readonly [key: string]: any;
}

export class FeedEventDto {
  @IsEnum(FeedEventType)
  @IsNotEmpty()
  @ApiProperty({ enum: FeedEventType })
  readonly type: FeedEventType;

  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ type: "string", format: "uuid" })
  readonly userId: string;

  @IsArray()
  @IsOptional()
  @IsUUID("7", { each: true })
  @ApiPropertyOptional({ type: [String], format: "uuid" })
  readonly entityIds?: string[] = [];

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ type: "integer", default: 1 })
  readonly count?: number = 1;

  @IsOptional()
  @ApiPropertyOptional({
    oneOf: [
      { type: "object", additionalProperties: true },
      { type: "array", items: { type: "object", additionalProperties: true } },
    ],
  })
  readonly metadata: FeedEventMetadata | FeedEventMetadata[];
}
