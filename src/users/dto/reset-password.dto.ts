import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ minLength: 6, example: 'NewPass@123' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}