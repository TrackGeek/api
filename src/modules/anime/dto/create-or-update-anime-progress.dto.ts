import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProgressStatus } from "@prisma/generated/enums";
import { Transform, Type } from "class-transformer";
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive } from "class-validator";

export class CreateOrUpdateAnimeProgressDto {
  @ApiProperty({ enum: ProgressStatus, enumName: "ProgressStatus" })
  @IsEnum(ProgressStatus)
  @Transform(({ value, obj }) => (obj.completedAt ? ProgressStatus.Completed : value))
  readonly status: ProgressStatus;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly watchCount?: number;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  readonly startedAt?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  readonly completedAt?: Date;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  readonly animeId: string;

  @ApiProperty({ type: String })
  readonly userId: string;
}
