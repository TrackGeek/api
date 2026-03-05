import { ProgressStatus } from "@prisma/generated/enums";
import { Transform } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive } from "class-validator";

export class CreateOrUpdateTVShowProgressDto {
  @IsEnum(ProgressStatus)
  @Transform(({ value, obj }) => obj.completedAt ? ProgressStatus.Completed : value)
  readonly status: ProgressStatus;
  
  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly watchCount?: number;
  
  @IsOptional()
  @IsDate()
  readonly startedAt?: Date;
  
  @IsOptional()
  @IsDate()
  readonly completedAt?: Date;

  @IsNotEmpty()
  readonly tvShowId: string;

  readonly userId: string;
}
