import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLineDto {
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() part_number?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unit_price?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discount_pct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() tax_rate_pct?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_recommended?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() quote_group_id?: string;
}