import { IsNotEmpty, IsOptional } from "class-validator";

export class UpdateProfileDto {
  @IsNotEmpty()
  readonly color: string;
  
  @IsNotEmpty()
  readonly language: string;
  
  @IsOptional()
  readonly timezone: string;
  
  @IsOptional()
  readonly about: string;
}
