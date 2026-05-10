import { IsString, IsOptional, IsInt, IsBoolean, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JOB_STATUSES } from './transition-status.dto';

export const WORKSHOP_STAGES = [
  'waiting_technician', 'diagnosis', 'estimate_prep',
  'customer_approval', 'work_in_progress', 'final_test',
  'quality_check', 'ready_handover',
] as const;

export const PARTS_STATUSES = [
  'no_parts', 'order_parts', 'waiting_warehouse', 'backorder', 'parts_ready', 'issued',
] as const;

export class UpdateJobDto {
  @ApiPropertyOptional({ enum: JOB_STATUSES }) @IsOptional() @IsEnum(JOB_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() advisor_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() technician_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customer_concern?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internal_notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() odometer_in?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() promised_at?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dms_ro_number?: string;
  @ApiPropertyOptional({ enum: WORKSHOP_STAGES }) @IsOptional() @IsEnum(WORKSHOP_STAGES) workshop_stage?: typeof WORKSHOP_STAGES[number];
  @ApiPropertyOptional({ enum: PARTS_STATUSES }) @IsOptional() @IsEnum(PARTS_STATUSES) parts_status?: typeof PARTS_STATUSES[number];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() customer_informed?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_customer_waiting?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() customer_sensitivity?: string;
}