import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ReportReason, ReportTargetType } from "@prisma/generated/enums";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateReportDto {
  @IsEnum(ReportTargetType)
  @ApiProperty({ enum: ReportTargetType })
  readonly targetType: ReportTargetType;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly targetId: string;

  @IsEnum(ReportReason)
  @ApiProperty({ enum: ReportReason })
  readonly reason: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @ApiPropertyOptional({ maxLength: 1000 })
  readonly details?: string;
}
