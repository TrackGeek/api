import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProgressStatus } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, Max, Min } from "class-validator";

export class CreateOrUpdateMovieProgressDto {
  @IsEnum(ProgressStatus)
  @ApiProperty({
    enum: ProgressStatus,
  })
  readonly status: ProgressStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  @ApiPropertyOptional({ type: "integer", minimum: 0, maximum: 999 })
  readonly watchCount?: number;

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
    description: "ID of the movie",
    example: "1226863",
    type: "string",
  })
  readonly movieId: string;

  @ApiProperty({
    description: "ID of the user",
    example: "1",
    type: "string",
  })
  readonly userId: string;
}
