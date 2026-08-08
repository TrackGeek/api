import { ApiPropertyOptional } from "@nestjs/swagger";
import { ProgressStatus } from "@prisma/generated/enums";
import { Transform, Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";
import { MediaReleaseState, ProgressSortBy, ProgressSortOrder } from "../media-filter.constants";

/** Query strings arrive either repeated (`genres=a&genres=b`) or comma-joined (`genres=a,b`). */
const toStringArray = ({ value }: { value: unknown }): string[] | undefined => {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const items = raw.map((item) => String(item).trim()).filter(Boolean);

  return items.length > 0 ? items : undefined;
};

const toBoolean = ({ value }: { value: unknown }): boolean | undefined => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;

  return undefined;
};

/** Filters shared by every `GET /{type}/progress` endpoint. */
export class ProgressFilterParamsDto extends OffsetPaginationParamsDto {
  @IsOptional()
  @IsEnum(ProgressStatus)
  @ApiPropertyOptional({ enum: ProgressStatus })
  readonly status?: ProgressStatus;

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String], description: "Genre names, repeated or comma-separated." })
  readonly genres?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @ApiPropertyOptional({ type: Number, description: "Release year of the media." })
  readonly year?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean, description: "`true` keeps released media, `false` keeps unreleased ones." })
  readonly released?: boolean;

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsEnum(MediaReleaseState, { each: true })
  @ApiPropertyOptional({ enum: MediaReleaseState, isArray: true })
  readonly releaseStates?: MediaReleaseState[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @ApiPropertyOptional({ type: String, description: "Case-insensitive match against the media title." })
  readonly search?: string;

  @IsOptional()
  @IsEnum(ProgressSortBy)
  @ApiPropertyOptional({ enum: ProgressSortBy, description: "Defaults to the date the entry was added." })
  readonly sortBy?: ProgressSortBy;

  @IsOptional()
  @IsEnum(ProgressSortOrder)
  @ApiPropertyOptional({ enum: ProgressSortOrder, description: "Defaults to `asc` for `name`, `desc` otherwise." })
  readonly sortOrder?: ProgressSortOrder;
}
