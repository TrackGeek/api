import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class GetProgressFiltersDto {
  @IsUUID()
  @ApiProperty({ type: String, format: "uuid", description: "Owner of the library the options are derived from." })
  readonly userId: string;
}
