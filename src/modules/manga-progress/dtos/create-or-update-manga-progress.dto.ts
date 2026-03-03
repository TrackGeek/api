import { ProgressStatus } from "@prisma/generated/enums";
import { Transform } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive } from "class-validator";

export class CreateOrUpdateMangaProgressDto {
  @IsEnum(ProgressStatus)
  @Transform(({ value, obj }) => obj.completedAt ? ProgressStatus.Completed : value)
  readonly status: ProgressStatus;
  
  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly chaptersRead?: number;
  
  @IsOptional()
  @IsDate()
  readonly startedAt?: Date;
  
  @IsOptional()
  @IsDate()
  readonly completedAt?: Date;

  @IsNotEmpty()
  readonly mangaId: string;

  readonly userId: string;
}
