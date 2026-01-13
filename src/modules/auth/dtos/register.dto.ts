import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @MinLength(3)
  @MaxLength(50)
  @ApiProperty({ minLength: 3, maxLength: 50, description: 'Full name of the user' })
  readonly name: string;
  
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