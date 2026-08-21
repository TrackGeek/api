import { ApiPropertyOptional } from "@nestjs/swagger";
import { CatchupMediaType } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetCatchupFeedDto extends OffsetPaginationParamsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  @ApiPropertyOptional({ type: "number", description: "How many days back the feed should look. Defaults to 7." })
  readonly days?: number;

  @IsOptional()
  @IsEnum(CatchupMediaType)
  @ApiPropertyOptional({ enum: CatchupMediaType, description: "Restrict the feed to a single media type." })
  readonly mediaType?: CatchupMediaType;
}

export class GetCatchupFeedByUserDto extends GetCatchupFeedDto {
  readonly userId: string;
}
