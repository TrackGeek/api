import { ListType } from "@prisma/generated/enums";
import { IsEnum, IsNotEmpty, IsOptional } from "class-validator";

export class CreateListDto {
  @IsNotEmpty()
  readonly name: string;

  @IsEnum(ListType)
  readonly type: ListType;

  @IsOptional()
  readonly description?: string;

  readonly userId: string;
}
