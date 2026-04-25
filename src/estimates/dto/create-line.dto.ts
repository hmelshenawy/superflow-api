import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLineDto {
  @ApiProperty() @IsString() job_id: string;
  @ApiProperty() @IsEnum(['labour','part','sublet']) type: string;
  @ApiProperty() @IsString() description: string;
  @ApiPropertyOptional() @IsOptional() @IsString() part_number?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unit_price?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discount_pct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() tax_rate_pct?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_recommended?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() inspection_response_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() quote_group_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() quote_group_title?: string;
}