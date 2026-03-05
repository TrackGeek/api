import { ProgressStatus } from "@prisma/generated/enums";
import { IsDate, IsEnum, IsNotEmpty, IsOptional } from "class-validator";

export class CreateOrUpdateMovieProgressDto {
  @IsEnum(ProgressStatus)
  readonly status: ProgressStatus;

  @IsOptional()
  @IsDate()
  readonly startedAt?: Date;

  @IsOptional()
  @IsDate()
  readonly completedAt?: Date;

  @IsNotEmpty()
  readonly movieId: string;

  readonly userId: string;
}
