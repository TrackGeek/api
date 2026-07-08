import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateListDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @ApiPropertyOptional({ type: "string" })
  readonly name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: "string" })
  readonly description?: string;

  readonly listId: string;

  readonly userId: string;
}
