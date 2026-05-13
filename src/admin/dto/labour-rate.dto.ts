import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLabourRateDto {
  @ApiProperty({ example: 'Engine Diagnostics' })
  @IsString()
  name: string;

  @ApiProperty({ example: 85 })
  @IsNumber()
  rate_per_hour: number;

  @ApiPropertyOptional({ example: 'SAR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateLabourRateDto {
  @ApiPropertyOptional({ example: 'Engine Diagnostics' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 95 })
  @IsOptional()
  @IsNumber()
  rate_per_hour?: number;

  @ApiPropertyOptional({ example: 'SAR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}