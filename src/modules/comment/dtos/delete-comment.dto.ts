import { IsUUID } from 'class-validator';

export class DeleteCommentDto {
  @IsUUID()
  readonly commentId: string;

  @IsUUID()
  readonly userId: string;
}
