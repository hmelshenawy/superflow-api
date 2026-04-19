import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDeferredDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(['pending','reminded','booked','closed','expired']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(['none','low','medium','high','critical']) urgency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remind_after?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() booked_job_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() closed_reason?: string;
}