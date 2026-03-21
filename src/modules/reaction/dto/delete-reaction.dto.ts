import { ApiProperty } from "@nestjs/swagger";

export class DeleteReactionDto {
  @ApiProperty({ type: "string" })
  readonly reactionId: string;

  @ApiProperty({ type: "string" })
  readonly userId: string;
}
