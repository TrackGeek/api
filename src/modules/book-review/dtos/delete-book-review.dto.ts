import { IsUUID } from 'class-validator';

export class DeleteBookReviewDto {
  @IsUUID()
  readonly bookReviewId: string;

  @IsUUID()
  readonly userId: string;
}
