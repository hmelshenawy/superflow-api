import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() permissions?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class UpdateRoleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() permissions?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}