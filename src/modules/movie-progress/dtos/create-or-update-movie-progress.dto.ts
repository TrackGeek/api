import { ProgressStatus } from "@prisma/generated/enums";
import { IsEnum, IsNotEmpty } from "class-validator";

export class CreateOrUpdateMovieProgressDto {
  @IsEnum(ProgressStatus)
  readonly status: ProgressStatus;

  @IsNotEmpty()
  readonly movieId: string;

  readonly userId: string;
}
