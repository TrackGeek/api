import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProgressStatus } from "@prisma/generated/enums";
import { Transform, Type } from "class-transformer";
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, MaxLength } from "class-validator";

export class CreateOrUpdateTVShowProgressDto {
  @IsEnum(ProgressStatus)
  @Transform(({ value, obj }) => (obj.completedAt ? ProgressStatus.Completed : value))
  @ApiProperty({
    enum: ProgressStatus,
  })
  readonly status: ProgressStatus;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @ApiPropertyOptional({
    type: "number",
  })
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

  @IsOptional()
  @MaxLength(1000)
  @ApiPropertyOptional({ type: "string", maxLength: 1000 })
  readonly notes?: string;

  @IsNotEmpty()
  @ApiProperty({
    description: "ID of the TV show",
    example: "14424",
    type: "string",
  })
  readonly tvShowId: string;

  @ApiProperty({
    description: "ID of the user",
    example: "1",
    type: "string",
  })
  readonly userId: string;
}
