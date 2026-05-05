import { IsString, IsOptional, IsArray, ArrayNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ALL_PERMISSIONS } from '../../common/permissions';

export class CreateRoleDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) permissions?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class UpdateRoleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) permissions?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}