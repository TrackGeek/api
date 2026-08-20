import { ApiProperty } from "@nestjs/swagger";
import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from "class-validator";

export class ReorderSetupItemsDto {
  readonly userId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID("all", { each: true })
  @ApiProperty({
    description: "IDs of the setup items in the desired order",
    example: ["019ce334-c8ac-7883-949d-948f53218272"],
    type: "string",
    isArray: true,
  })
  readonly itemIds: string[];
}
