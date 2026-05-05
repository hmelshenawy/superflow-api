import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const JOB_STATUSES = [
  'booked', 'checking', 'estimate_sent', 'approved', 'in_progress',
  'waiting_parts', 'quality_check', 'ready', 'closed', 'no_show',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export class TransitionStatusDto {
  @ApiProperty({ enum: JOB_STATUSES }) @IsEnum(JOB_STATUSES) to_status: JobStatus;
  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;
}