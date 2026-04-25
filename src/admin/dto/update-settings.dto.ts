import { Allow, IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SettingItemDto {
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiPropertyOptional({ enum: ['string', 'number', 'boolean', 'json'] })
  @IsOptional()
  @IsEnum(['string', 'number', 'boolean', 'json'])
  valueType?: 'string' | 'number' | 'boolean' | 'json';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @Allow()
  value?: any;
}

export class UpdateSettingsDto {
  @ApiProperty({ type: [SettingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingItemDto)
  settings!: SettingItemDto[];
}
