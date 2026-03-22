import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class GetTVShowEpisodeWatchDto {
  @IsUUID()
  @ApiProperty({
    description: "ID of the user",
    example: "1",
    type: "string",
  })
  readonly userId: string;

  @IsUUID()
  @ApiProperty({
    description: "ID of the TV show",
    example: "8f1be700-6346-457c-a65f-85cfa2a2e22f",
    type: "string",
  })
  readonly tvShowId: string;
}
