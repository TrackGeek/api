import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { ProgressFilterParamsDto } from "@/shared/media-filter/dtos/progress-filter.dto";

const toArray = ({ value }: { value: unknown }) =>
  typeof value === "string"
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : value;

export class GetGameProgressDto extends ProgressFilterParamsDto {
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsIn(["mainStory", "mainStoryPlusExtras", "100%", "endless"], { each: true })
  @ApiPropertyOptional({ type: [String] })
  readonly completion?: string[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @ApiPropertyOptional({ type: [String] })
  readonly selectedPlatforms?: string[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @ApiPropertyOptional({ type: [String] })
  readonly availablePlatforms?: string[];

  @IsUUID()
  @IsOptional()
  @ApiProperty({
    description: "ID of the user",
    example: "019ce334-a06a-78bc-9178-93f7274610ee",
    type: "string",
  })
  readonly userId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({
    description: "ID of the game",
    example: "019ce334-c8ac-7883-949d-948f53218272",
    type: "string",
  })
  readonly gameId?: string;
}
