import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class BulkEstimateLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  job_id?: string;

  @ApiProperty()
  @IsEnum(['labour', 'part', 'sublet'])
  type: 'labour' | 'part' | 'sublet';

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  part_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unit_price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discount_pct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tax_rate_pct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_recommended?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inspection_response_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quote_group_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quote_group_title?: string;
}

export class BulkReplaceLinesDto {
  @ApiProperty({ type: [BulkEstimateLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkEstimateLineDto)
  lines: BulkEstimateLineDto[];
}
