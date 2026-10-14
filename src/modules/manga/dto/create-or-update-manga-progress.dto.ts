import { ProgressStatus } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from "class-validator";

export class CreateOrUpdateMangaProgressDto {
  @IsEnum(ProgressStatus)
  readonly status: ProgressStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  readonly chaptersRead?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  readonly readCount?: number;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  readonly startedAt?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  readonly completedAt?: Date;

  @IsNotEmpty()
  readonly mangaId: string;

  readonly userId: string;
}
