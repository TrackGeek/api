import { IsNotEmpty, IsOptional } from "class-validator";

export class CreateProfileDto {
  @IsNotEmpty()
  readonly userId: string;
  
  @IsOptional()
  readonly avatarUrl?: string | null;
}
