import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateJobDto {
  @ApiPropertyOptional() @IsOptional() @IsString() advisor_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() technician_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customer_concern?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internal_notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() odometer_in?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() promised_at?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dms_ro_number?: string;
}