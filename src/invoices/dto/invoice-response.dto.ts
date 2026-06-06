import { IsString, IsOptional, IsInt, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  CANCELLED = 'cancelled',
}

export class InvoiceLineItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() invoice_id: string;
  @ApiProperty({ enum: ['labour', 'part', 'other'] }) type: string;
  @ApiProperty() description: string;
  @ApiPropertyOptional() sku?: string;
  @ApiProperty() quantity: number;
  @ApiProperty() unit_price_cents: number;
  @ApiProperty() discount_cents: number;
  @ApiProperty() line_total_cents: number;
  @ApiProperty() vat_rate: number;
  @ApiProperty() vat_applicable: boolean;
  @ApiProperty() line_vat_cents: number;
  @ApiProperty() sort_order: number;
}

export class InvoiceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() workshop_id: string;
  @ApiPropertyOptional() branch_id?: string;
  @ApiProperty() invoice_number: string;
  @ApiProperty() invoice_year: number;
  @ApiProperty() invoice_serial_number: number;
  @ApiProperty() workshop_code_snapshot: string;
  @ApiProperty() branch_code_snapshot: string;
  @ApiPropertyOptional() job_id?: string;
  @ApiPropertyOptional() customer_id?: string;
  @ApiPropertyOptional() vehicle_id?: string;
  @ApiProperty({ enum: InvoiceStatus }) status: InvoiceStatus;
  @ApiPropertyOptional() notes?: string;
  @ApiPropertyOptional() internal_notes?: string;
  @ApiProperty() subtotal_cents: number;
  @ApiProperty() discount_total_cents: number;
  @ApiProperty() tax_total_cents: number;
  @ApiProperty() grand_total_cents: number;
  @ApiProperty() total_cents: number;
  @ApiPropertyOptional() issued_at?: Date;
  @ApiPropertyOptional() cancelled_at?: Date;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
  @ApiPropertyOptional() snapshot_customer_name?: string;
  @ApiPropertyOptional() snapshot_customer_email?: string;
  @ApiPropertyOptional() snapshot_customer_phone?: string;
  @ApiPropertyOptional() snapshot_vehicle_vin?: string;
  @ApiPropertyOptional() snapshot_vehicle_plate?: string;
  @ApiPropertyOptional() snapshot_vehicle_make?: string;
  @ApiPropertyOptional() snapshot_vehicle_model?: string;
  @ApiPropertyOptional() snapshot_vehicle_year?: number;
  @ApiPropertyOptional() snapshot_vehicle_color?: string;
  @ApiPropertyOptional() snapshot_advisor_name?: string;
  @ApiPropertyOptional() items?: InvoiceLineItemResponseDto[];
}
