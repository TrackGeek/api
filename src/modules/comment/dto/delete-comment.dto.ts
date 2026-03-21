import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class DeleteCommentDto {
  @IsUUID()
  @ApiProperty({ type: "string", format: "uuid" })
  readonly commentId: string;

  @IsUUID()
  @ApiProperty({ type: "string", format: "uuid" })
  readonly userId: string;
}
