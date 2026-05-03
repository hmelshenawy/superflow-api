import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employee_code?: string;
  @ApiPropertyOptional({ minLength: 6 }) @IsOptional() @IsString() @MinLength(6) password?: string;
}