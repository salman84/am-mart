import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Username, phone number, or email', example: 'Admin' })
  @IsString()
  identifier: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;
}
