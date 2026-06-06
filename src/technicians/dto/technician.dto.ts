import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { technician_clock_event_type } from '@prisma/client';

export class ClockEventDto {
  @IsString()
  technician_id!: string;

  @IsEnum(technician_clock_event_type)
  event_type!: technician_clock_event_type;

  @IsOptional()
  @IsString()
  note?: string;
}

export class TechnicianProductivityQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  period?: 'today' | 'week' | 'month';
}