import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ minLength: 8 }) @MinLength(8) password: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employee_code?: string;
}