import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ReportStatus } from "@prisma/generated/enums";
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateReportDto {
  @IsIn([ReportStatus.Resolved, ReportStatus.Dismissed])
  @ApiProperty({ enum: [ReportStatus.Resolved, ReportStatus.Dismissed] })
  readonly status: typeof ReportStatus.Resolved | typeof ReportStatus.Dismissed;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @ApiPropertyOptional({ maxLength: 1000 })
  readonly resolutionNote?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  readonly removeContent?: boolean;
}
