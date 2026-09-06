import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { POST_MAX_LENGTH } from "./create-post.dto";

export class UpdatePostDto {
  readonly postId: string;

  readonly userId: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(POST_MAX_LENGTH)
  @ApiPropertyOptional({ type: "string", maxLength: POST_MAX_LENGTH })
  readonly content?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: "boolean" })
  readonly isSpoiler?: boolean;
}
