import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetNotificationsDto extends OffsetPaginationParamsDto {
  @IsOptional()
  @Transform(({ value }) => (value === "true" ? true : value === "false" ? false : value))
  @IsBoolean()
  @ApiPropertyOptional({ type: "boolean", description: "Filter by read state. Omit to return every notification." })
  readonly read?: boolean;
}

export class GetNotificationsByUserDto extends GetNotificationsDto {
  readonly userId: string;
}
