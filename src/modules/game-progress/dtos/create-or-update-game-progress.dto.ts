import { ProgressStatus } from "@prisma/generated/enums";
import { IsEnum, IsNotEmpty } from "class-validator";

export class CreateOrUpdateGameProgressDto {
  @IsEnum(ProgressStatus)
  readonly status: ProgressStatus;

  @IsNotEmpty()
  readonly gameId: string;

  readonly userId: string;
}
