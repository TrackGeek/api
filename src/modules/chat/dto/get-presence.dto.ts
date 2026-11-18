import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from "class-validator";
import { MAX_PRESENCE_IDS_PER_CALL } from "../chat.constants";

export class GetPresenceDto {
  @Transform(({ value }) =>
    typeof value === "string"
      ? value
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_PRESENCE_IDS_PER_CALL)
  @IsString({ each: true })
  @ApiProperty({ type: String, description: "Comma separated user ids", example: "id1,id2" })
  readonly userIds: string[];
}
