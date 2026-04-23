import { ProgressStatus } from "@prisma/generated/enums";
import { Transform, Type } from "class-transformer";
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive } from "class-validator";

export class CreateOrUpdateMangaProgressDto {
  @IsEnum(ProgressStatus)
  @Transform(({ value, obj }) => (obj.completedAt ? ProgressStatus.Completed : value))
  readonly status: ProgressStatus;

  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly chaptersRead?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
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
