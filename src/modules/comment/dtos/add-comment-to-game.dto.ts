import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from 'class-validator';
import { CreateCommentDto } from './create-comment.dto';

export class AddCommentToGameDto extends CreateCommentDto {
  @IsNotEmpty()
  @ApiProperty({ example: 'Game identifier' })
  readonly gameId: string;
}
