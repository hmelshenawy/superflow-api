import { IsString, IsOptional, IsArray, IsEnum, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const INPUT_TYPES = [
  'pass_fail', 'yes_no', 'ok_warn_fail', 'number',
  'text', 'toggle', 'photo', 'odometer', 'fuel_level',
] as const;

export class CreateItemDto {
  @ApiProperty() @IsString() section_id: string;
  @ApiProperty() @IsString() label: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(INPUT_TYPES) input_type?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() options?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requires_photo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() requires_note_on?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() help_text?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() sort_order?: number;
}

export class UpdateItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(INPUT_TYPES) input_type?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() options?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requires_photo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() requires_note_on?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() help_text?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() sort_order?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}