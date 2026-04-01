import { ProgressStatus } from "@prisma/generated/enums";
import { Transform, Type } from "class-transformer";
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive } from "class-validator";

export class CreateOrUpdateAnimeProgressDto {
  @IsEnum(ProgressStatus)
  @Transform(({ value, obj }) => (obj.completedAt ? ProgressStatus.Completed : value))
  readonly status: ProgressStatus;

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

  @IsNotEmpty()
  readonly animeId: string;

  readonly userId: string;
}
