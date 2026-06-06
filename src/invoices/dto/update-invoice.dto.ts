import { IsString, IsOptional, IsInt, IsEnum, IsBoolean, IsArray, ValidateNested, Min, IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceItemType } from './create-invoice.dto';

export class UpdateLineItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ enum: InvoiceItemType })
  @IsOptional()
  @IsEnum(InvoiceItemType)
  type?: InvoiceItemType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Unit price in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  unit_price_cents?: number;

  @ApiPropertyOptional({ description: 'Line discount in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discount_cents?: number;

  @ApiPropertyOptional({ description: 'VAT rate as decimal, e.g. 0.05 for 5%' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vat_rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  vat_applicable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}

export class UpdateInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branch_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customer_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicle_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internal_notes?: string;

  @ApiPropertyOptional({ description: 'Global discount in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discount_total_cents?: number;

  @ApiPropertyOptional({ type: [UpdateLineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateLineItemDto)
  items?: UpdateLineItemDto[];
}
