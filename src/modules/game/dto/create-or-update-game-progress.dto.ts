import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProgressStatus } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateOrUpdateGameProgressDto {
  @IsEnum(ProgressStatus)
  @ApiProperty({
    enum: ProgressStatus,
  })
  readonly status: ProgressStatus;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @ApiPropertyOptional({
    type: "integer",
    minimum: 1,
  })
  readonly playCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional({ type: "string", maxLength: 100 })
  readonly completion?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ type: "integer", minimum: 0 })
  readonly hoursPlayed?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @ApiPropertyOptional({
    description: "Slugs of the platforms the game was played on. Must belong to the game's available platforms.",
    type: "string",
    isArray: true,
    example: ["playstation-5", "win"],
  })
  readonly platforms?: string[];

  @IsOptional()
  @MaxLength(1000)
  @ApiPropertyOptional({ type: "string", maxLength: 1000 })
  readonly notes?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @ApiPropertyOptional({ type: "string", format: "date-time", example: "2026-03-12T06:20:32.232Z" })
  readonly startedAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @ApiPropertyOptional({ type: "string", format: "date-time", example: "2026-03-12T06:20:32.232Z" })
  readonly completedAt?: Date;

  @IsNotEmpty()
  @ApiProperty({
    description: "ID of the game",
    example: "019ce334-c8ac-7883-949d-948f53218272",
    type: "string",
  })
  readonly gameId: string;

  @ApiProperty({
    description: "ID of the user",
    example: "019ce334-a06a-78bc-9178-93f7274610ee",
    type: "string",
  })
  readonly userId: string;
}
