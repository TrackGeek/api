import { IsNotEmpty } from "class-validator";

export class CreateUserDto {
  @IsNotEmpty()
  readonly id: string;
  
  @IsNotEmpty()
  readonly email: string;
  
  readonly emailVerified?: boolean;
  
  readonly name?: string;
  
  readonly image?: string | null;
}
