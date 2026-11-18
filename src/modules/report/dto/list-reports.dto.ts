import { ApiPropertyOptional } from "@nestjs/swagger";
import { ReportStatus, ReportTargetType } from "@prisma/generated/enums";
import { IsEnum, IsOptional } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class ListReportsDto extends OffsetPaginationParamsDto {
  @IsOptional()
  @IsEnum(ReportStatus)
  @ApiPropertyOptional({ enum: ReportStatus })
  readonly status?: ReportStatus;

  @IsOptional()
  @IsEnum(ReportTargetType)
  @ApiPropertyOptional({ enum: ReportTargetType })
  readonly targetType?: ReportTargetType;
}
