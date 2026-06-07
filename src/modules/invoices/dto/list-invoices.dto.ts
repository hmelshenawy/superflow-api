import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum InvoiceStatusFilter {
  ALL = 'all',
  DRAFT = 'draft',
  ISSUED = 'issued',
  CANCELLED = 'cancelled',
}

export class ListInvoicesDto {
  @ApiPropertyOptional({ enum: InvoiceStatusFilter, default: InvoiceStatusFilter.ALL })
  @IsOptional()
  @IsEnum(InvoiceStatusFilter)
  status?: InvoiceStatusFilter = InvoiceStatusFilter.ALL;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

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
  branch_id?: string;

  @ApiPropertyOptional({ description: 'Page number (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
