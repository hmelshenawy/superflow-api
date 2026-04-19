import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty() @IsString() customer_id: string;
  @ApiProperty() @IsString() vehicle_id: string;
  @ApiPropertyOptional() @IsOptional() @IsString() advisor_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() technician_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customer_concern?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() odometer_in?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() promised_at?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dms_ro_number?: string;
}