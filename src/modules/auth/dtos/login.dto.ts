import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(100)
  @ApiProperty({ format: 'email', maxLength: 100, description: 'Email address of the user' })
  readonly email: string;
  
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(100)
  @ApiProperty({ minLength: 6, maxLength: 100, description: 'Password for the user account' })
  readonly password: string;
}