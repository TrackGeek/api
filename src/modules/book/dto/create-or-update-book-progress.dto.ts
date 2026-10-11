import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProgressStatus } from "@prisma/generated/enums";
import { Transform, Type } from "class-transformer";
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, Max, Min } from "class-validator";

export class CreateOrUpdateBookProgressDto {
  @IsEnum(ProgressStatus)
  @Transform(({ value, obj }) => (obj.completedAt ? ProgressStatus.Completed : value))
  @ApiProperty({
    enum: ProgressStatus,
  })
  readonly status: ProgressStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  @ApiPropertyOptional({
    description: "Number of pages read",
    type: "integer",
    minimum: 0,
  })
  readonly chaptersRead?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(2147483647)
  @ApiPropertyOptional({
    description: "Total pages in the user's edition, defaulting to Hardcover when first saved",
    type: "integer",
    minimum: 1,
    maximum: 2147483647,
  })
  readonly totalPages?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({
    type: "integer",
    minimum: 0,
  })
  readonly readCount?: number;

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
    description: "ID of the book",
    example: "019ce334-c8ac-7883-949d-948f53218272",
    type: "string",
  })
  readonly bookId: string;

  @ApiProperty({
    description: "ID of the user",
    example: "019ce334-a06a-78bc-9178-93f7274610ee",
    type: "string",
  })
  readonly userId: string;
}
