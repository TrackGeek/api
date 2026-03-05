import { ProgressStatus } from "@prisma/generated/enums";
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive } from "class-validator";

export class CreateOrUpdateGameProgressDto {
  @IsEnum(ProgressStatus)
  readonly status: ProgressStatus;
  
  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly playCount?: number;
  
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
