import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from 'class-validator';
import { CreateCommentDto } from './create-comment.dto';

export class AddCommentToProfileDto extends CreateCommentDto {
  @IsNotEmpty()
  @ApiProperty({ example: 'Profile identifier' })
  readonly  profileId: string;
}
