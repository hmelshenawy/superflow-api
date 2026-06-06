import { IsString, IsOptional, IsInt, IsEnum, IsBoolean, IsArray, ValidateNested, Min, ArrayMinSize, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum InvoiceItemType {
  LABOUR = 'labour',
  PART = 'part',
  OTHER = 'other',
}

export class CreateLineItemDto {
  @ApiProperty({ enum: InvoiceItemType })
  @IsEnum(InvoiceItemType)
  type: InvoiceItemType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: 'Unit price in cents' })
  @IsInt()
  @Min(0)
  unit_price_cents: number;

  @ApiPropertyOptional({ description: 'Line discount in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discount_cents?: number;

  @ApiPropertyOptional({ description: 'VAT rate as decimal, e.g. 0.05 for 5%' })
  @IsOptional()
  @IsInt()
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

export class CreateInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branch_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  job_id?: string;

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

  @ApiProperty({ type: [CreateLineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLineItemDto)
  @ArrayMinSize(1)
  items: CreateLineItemDto[];
}
