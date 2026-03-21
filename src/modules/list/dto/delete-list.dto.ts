import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class DeleteListDto {
  @IsUUID()
  @ApiProperty({ type: "string", format: "uuid" })
  readonly listId: string;

  @ApiProperty({ type: "string", format: "uuid" })
  readonly userId: string;
}
