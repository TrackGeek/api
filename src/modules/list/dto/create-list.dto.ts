import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ListType } from "@prisma/generated/enums";
import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export class CreateListDto {
  @IsNotEmpty()
  @ApiProperty({ type: "string" })
  readonly name: string;

  @IsEnum(ListType)
  @ApiProperty({ enum: ListType })
  readonly type: ListType;

  @IsOptional()
  @ApiPropertyOptional({ type: "string" })
  readonly description?: string;

  @ApiProperty({ type: "string" })
  readonly userId: string;
}
