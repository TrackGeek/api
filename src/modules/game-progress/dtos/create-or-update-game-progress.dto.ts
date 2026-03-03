import { ProgressStatus } from "@prisma/generated/enums";
import { IsDate, IsEnum, IsNotEmpty, IsOptional } from "class-validator";

export class CreateOrUpdateGameProgressDto {
  @IsEnum(ProgressStatus)
  readonly status: ProgressStatus;
  
  @IsOptional()
  @IsDate()
  readonly startedAt?: Date;
  
  @IsOptional()
  @IsDate()
  readonly completedAt?: Date;

  @IsNotEmpty()
  readonly gameId: string;

  readonly userId: string;
}
