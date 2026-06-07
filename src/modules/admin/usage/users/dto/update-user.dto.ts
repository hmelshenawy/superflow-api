import { IsBoolean, IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employee_code?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
  @ApiPropertyOptional({ minLength: 8 }) @IsOptional() @IsString() @MinLength(8) password?: string;
}
