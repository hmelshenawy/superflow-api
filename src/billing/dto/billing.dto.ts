import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivateSubscriptionDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  workshopId: string;

  @ApiProperty({ example: 'plan_starter' })
  @IsString()
  planId: string;

  @ApiPropertyOptional({ example: 'gcc' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  priceOverrideCents?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  discountPct?: number;

  @ApiPropertyOptional({ example: 'Manual activation' })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  workshopId: string;

  @ApiProperty({ example: 'plan_starter' })
  @IsString()
  planId: string;

  @ApiPropertyOptional({ example: 'gcc' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  periodStart?: string;

  @ApiPropertyOptional({ example: '2026-01-31' })
  @IsOptional()
  @IsString()
  periodEnd?: string;
}

export class MarkPaidDto {
  @ApiPropertyOptional({ example: 'manual' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ example: 'INV-2026-001' })
  @IsOptional()
  @IsString()
  reference?: string;
}