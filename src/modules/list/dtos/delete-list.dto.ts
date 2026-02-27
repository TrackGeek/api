import { IsUUID } from "class-validator";

export class DeleteListDto {
  @IsUUID()
  readonly listId: string;

  readonly userId: string;
}
